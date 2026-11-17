from __future__ import annotations

import json
import re
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parent
TOURISM_JSON = ROOT / "data" / "india_tourism_dataset.json"
ATTRACTIONS_CSV = ROOT / "data" / "top_indian_places.csv"

COLUMN_ALIASES = {
    "name": ["name", "place", "attraction", "tourist place"],
    "city": ["city", "district"],
    "state": ["state"],
    "category": ["type", "category", "significance"],
    "duration": ["time needed to visit in hrs", "time_needed_to_visit_in_hrs", "visit_duration"],
    "rating": ["google review rating", "rating", "google_rating"],
    "fee": ["entrance fee in inr", "entrance_fee_in_inr", "entry_fee", "entrance fee"],
    "weekly_off": ["weekly off", "weekly_off"],
    "best_time": ["best time to visit", "best_time_to_visit"],
}


def key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold()).strip()


def load_destinations() -> list[dict]:
    if not TOURISM_JSON.exists():
        raise FileNotFoundError(f"Destination dataset not found: {TOURISM_JSON}")
    with TOURISM_JSON.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError("Indian Tourism dataset must contain a JSON array.")
    return data


def match_destination(query: str, records: list[dict]) -> dict:
    target = key(query)
    candidates = []
    for record in records:
        for field in ("destination_name", "name", "destination", "state", "district"):
            value = key(record.get(field))
            if not value:
                continue
            if target == value:
                return record
            score = 0.90 if target in value or value in target else SequenceMatcher(None, target, value).ratio()
            candidates.append((score, record))
    if not candidates:
        raise HTTPException(status_code=404, detail="No matching destination was found.")
    score, record = max(candidates, key=lambda item: item[0])
    if score < 0.68:
        suggestions = [str(x.get("state") or x.get("name") or x.get("destination")) for x in records[:12]]
        raise HTTPException(status_code=404, detail={"message": "Destination not found.", "suggestions": suggestions})
    return record


def load_attractions() -> list[dict]:
    if not ATTRACTIONS_CSV.exists():
        return []
    frame = pd.read_csv(ATTRACTIONS_CSV)
    normalized = {key(column): column for column in frame.columns}
    resolved = {}
    for target, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if key(alias) in normalized:
                resolved[target] = normalized[key(alias)]
                break
    if "name" not in resolved:
        raise ValueError("Attraction CSV must contain a Name column.")
    result = []
    for _, row in frame.iterrows():
        item = {name: row[column] for name, column in resolved.items()}
        if pd.notna(item.get("name")):
            result.append(item)
    return result


def build_attractions(destination: dict, rows: list[dict]) -> list[dict]:
    state = key(destination.get("state"))
    district = key(destination.get("district"))
    dest_name = key(destination.get("destination_name") or destination.get("name") or destination.get("destination"))
    matched = []
    for row in rows:
        row_state, row_city = key(row.get("state")), key(row.get("city"))
        if not ((row_state and state and row_state in state) or
                (row_city and (row_city in district or row_city in dest_name or dest_name in row_city))):
            continue
        def number(value, fallback):
            try:
                return float(value) if pd.notna(value) else fallback
            except (TypeError, ValueError):
                return fallback
        matched.append({
            "name": str(row.get("name")).strip(),
            "city": str(row.get("city") or destination.get("destination_name") or destination.get("state") or ""),
            "category": str(row.get("category") or "Attraction"),
            "duration_hours": max(0.5, min(number(row.get("duration"), 1.5), 8.0)),
            "rating": max(0.0, min(number(row.get("rating"), 0.0), 5.0)),
            "entry_fee": max(0.0, number(row.get("fee"), 0.0)),
            "weekly_off": str(row.get("weekly_off") or ""),
            "best_time": str(row.get("best_time") or ""),
            "source": "attraction_catalogue",
        })
    if matched:
        return matched

    # Fallback to the real destination attractions and experiences in the tourism JSON.
    result = []
    for name in (destination.get("primary_attractions") or []) + (destination.get("hidden_gems") or []):
        result.append({
            "name": str(name), "city": str(destination.get("destination_name") or destination.get("state") or ""), "category": "Destination attraction",
            "duration_hours": 2.0, "rating": 0.0, "entry_fee": 0.0,
            "weekly_off": "", "best_time": "", "source": "destination_profile",
        })
    for activity in destination.get("activities_available") or []:
        result.append({
            "name": str(activity), "city": str(destination.get("destination_name") or destination.get("state") or ""), "category": "Experience",
            "duration_hours": 1.5, "rating": 0.0, "entry_fee": 0.0,
            "weekly_off": "", "best_time": "", "source": "destination_profile",
        })
    return result


def interest_score(item: dict, interests: set[str]) -> float:
    if not interests:
        return 0.0
    searchable = key(" ".join(str(item.get(k) or "") for k in ("name", "category", "description")))
    return sum(1 for interest in interests if key(interest) in searchable) / len(interests)


def season_context(destination: dict, travel_date: str | None) -> dict:
    best = destination.get("best_seasons") or []
    avoid = destination.get("avoid_seasons") or []
    temps = destination.get("average_temperature") or {}
    season = "Not specified"
    if travel_date:
        try:
            month = date.fromisoformat(travel_date[:10]).month
            season = ("Winter" if month in (12, 1, 2) else
                      "Summer" if month in (3, 4, 5) else
                      "Monsoon" if month in (6, 7, 8, 9) else "Post-Monsoon")
        except ValueError:
            pass
    return {
        "travel_season": season,
        "best_seasons": best,
        "avoid_seasons": avoid,
        "season_suitable": season.casefold() in {key(x) for x in best} if season != "Not specified" else None,
        "historical_temperature": temps.get(season.casefold(), "Not available"),
        "rainfall_pattern": destination.get("rainfall_pattern", "Not available"),
        "note": "Historical destination context, not a live weather forecast.",
    }


def generate_smart_itinerary(
    destination_name: str,
    duration: int,
    interests: list[str] | None = None,
    budget: float = 15000,
    travelers: int = 1,
    travel_date: str | None = None,
) -> dict:
    if duration < 1 or duration > 30:
        raise HTTPException(status_code=422, detail="Trip duration must be between 1 and 30 days.")
    destination = match_destination(destination_name, load_destinations())
    max_days = int(destination.get("maximum_days") or destination.get("ideal_days") or 30)
    if duration > max_days:
        raise HTTPException(status_code=422, detail=f"This destination profile recommends up to {max_days} days.")
    attraction_rows = load_attractions()
    candidates = build_attractions(destination, attraction_rows)
    if not candidates:
        raise HTTPException(status_code=422, detail="No attractions are available for this destination.")
    interests_set = {key(x) for x in (interests or []) if key(x)}
    popularity = float(destination.get("popularity_score") or 0) / 10

    def score(item):
        preference = interest_score(item, interests_set)
        rating = float(item.get("rating") or 0) / 5
        fee = float(item.get("entry_fee") or 0)
        daily_budget = max(1.0, budget / max(1, duration * travelers))
        cost_fit = max(0.0, 1.0 - fee / daily_budget)
        return round(0.55 * preference + 0.25 * rating + 0.10 * popularity + 0.10 * cost_fit, 4)

    unique = {}
    for item in candidates:
        item["recommendation_score"] = score(item)
        unique.setdefault(key(item["name"]), item)
    ranked = sorted(unique.values(), key=lambda x: (-x["recommendation_score"], x["name"]))
    selected = ranked[:min(len(ranked), duration * 3)]
    day_bins = [[] for _ in range(duration)]
    # Keep attractions from the same city together where the source CSV provides City.
    # No street-level route distance is inferred because the source CSV has no coordinates.
    for item in selected:
        city = key(item.get("city"))
        compatible = [
            index for index, day in enumerate(day_bins)
            if len(day) < 3 and (not day or all(key(existing.get("city")) == city for existing in day))
        ]
        available = compatible or [index for index, day in enumerate(day_bins) if len(day) < 3]
        if not available:
            break
        target_day = min(available, key=lambda index: (len(day_bins[index]), index))
        day_bins[target_day].append(item)

    days, total_entry_fees = [], 0.0
    slot_times = [("09:00", "morning"), ("14:00", "afternoon"), ("17:00", "evening")]
    for day_index, items in enumerate(day_bins, start=1):
        activities = []
        for item, (time_label, period) in zip(items, slot_times):
            if item.get("weekly_off") and travel_date:
                try:
                    weekday = date.fromisoformat(travel_date[:10]).strftime("%A")
                    if weekday.casefold() in key(item["weekly_off"]):
                        continue
                except ValueError:
                    pass
            fee = float(item.get("entry_fee") or 0)
            total_entry_fees += fee * travelers
            description = f"{item['category']} · {item['duration_hours']:g} hr visit"
            if item.get("rating"):
                description += f" · Rating {item['rating']:.1f}/5"
            if item.get("best_time"):
                description += f" · Best time: {item['best_time']}"
            activities.append({
                "title": item["name"], "period": period, "time": time_label,
                "description": description, "estimated_cost_inr": round(fee * travelers),
            })
        days.append({
            "day_number": day_index, "title": f"Day {day_index}",
            "theme": f"Explore {destination.get('destination_name') or destination.get('state')}",
            "activities": activities,
        })

    budget_key = ("budget_category" if budget / max(1, duration * travelers) < 3000 else
                  "mid_range_category" if budget / max(1, duration * travelers) < 8000 else
                  "luxury_category")
    budget_data = destination.get(budget_key) or {}
    return {
        "source": "SafeTrip-AI Indian Tourism Dataset" + (" + Top Indian Places to Visit" if attraction_rows else ""),
        "destination": destination.get("destination_name") or destination.get("state") or destination_name,
        "state": destination.get("state"),
        "available_days": max_days,
        "requested_days": duration,
        "days": days,
        "total_activities": sum(len(x["activities"]) for x in days),
        "matched_interests": sorted(interests_set),
        "interest_match_score": round(100 * sum(interest_score(x, interests_set) for x in selected) / max(1, len(selected)), 1) if interests_set else 0,
        "estimated_entry_fees_inr": round(total_entry_fees),
        "budget_category": budget_key.replace("_", " ").title(),
        "destination_daily_budget_range_inr": budget_data.get("total_daily_range", [0, 0]),
        "budget_input_inr": round(budget),
        "season_context": season_context(destination, travel_date),
        "destination_context": {
            "district": destination.get("district"), "region": destination.get("region"),
            "altitude_m": destination.get("altitude_m"),
            "unique_experiences": destination.get("unique_experiences"),
            "local_cuisine": destination.get("local_cuisine_must_try") or destination.get("food_scene"),
            "nearest_airport": destination.get("nearest_airport"),
            "nearest_railway_station": destination.get("nearest_railway_station"),
        },
        "limitations": [
            "Exact attraction-to-attraction distances need attraction coordinates or a routing API.",
            "Season information is historical and is not a live weather forecast.",
        ],
    }
