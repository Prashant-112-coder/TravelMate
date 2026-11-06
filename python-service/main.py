from __future__ import annotations

import os
import re
from datetime import date, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "traveller_pair_random_forest.joblib"
ITINERARY_DATASET_PATH = ROOT / "data" / "tourism_iternary_dataset.csv"
ML_SERVICE_TOKEN = os.getenv("ML_SERVICE_TOKEN", "")

app = FastAPI(title="Travel Mate ML and Dataset Itinerary API", version="1.1.0")
_model = None
_itinerary_frame: pd.DataFrame | None = None

class RankRequest(BaseModel):
    source: dict[str, Any]
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    top_n: int = Field(default=30, ge=1, le=100)

class ItineraryRequest(BaseModel):
    destination: str = Field(min_length=2, max_length=120)
    duration: int = Field(ge=1, le=30)
    interests: list[str] = Field(default_factory=list, max_length=20)

def model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise RuntimeError("Model artifact missing: models/traveller_pair_random_forest.joblib")
        _model = joblib.load(MODEL_PATH)
    return _model

def norm(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().casefold()

def normalize_destination(value: Any) -> str:
    text = norm(value)
    text = re.sub(r"[^\w]+", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+india$", "", text).strip()
    return text

def load_itinerary_dataset() -> pd.DataFrame:
    global _itinerary_frame
    if _itinerary_frame is None:
        if not ITINERARY_DATASET_PATH.exists():
            raise FileNotFoundError(
                "Itinerary dataset missing. Place tourism_iternary_dataset.csv in python-service/data/."
            )
        frame = pd.read_csv(ITINERARY_DATASET_PATH)
        required = {
            "input__destination", "input__duration",
            "input__interests__001", "input__interests__002",
            "input__interests__003", "input__interests__004",
            "input__interests__005", "output__optimized_itinerary__state",
            "output__optimized_itinerary__days__day",
            "output__optimized_itinerary__days__morning",
            "output__optimized_itinerary__days__afternoon",
            "output__optimized_itinerary__days__evening",
        }
        missing = required.difference(frame.columns)
        if missing:
            raise ValueError("Dataset is missing required columns: " + ", ".join(sorted(missing)))
        # Each non-empty destination row starts an itinerary; subsequent day rows inherit its inputs.
        frame["input__destination"] = frame["input__destination"].ffill()
        frame["input__duration"] = frame["input__duration"].ffill()
        for column in [f"input__interests__{index:03d}" for index in range(1, 6)] + ["output__optimized_itinerary__state"]:
            frame[column] = frame[column].ffill()
        _itinerary_frame = frame
    return _itinerary_frame

def _interest_values(row: pd.Series) -> set[str]:
    values: set[str] = set()
    for index in range(1, 6):
        value = row.get(f"input__interests__{index:03d}")
        if pd.notna(value):
            cleaned = norm(value)
            if cleaned:
                values.add(cleaned)
    return values

def generate_dataset_itinerary(payload: ItineraryRequest) -> dict[str, Any]:
    frame = load_itinerary_dataset()
    requested = normalize_destination(payload.destination)
    frame = frame.copy()
    frame["_destination_key"] = frame["input__destination"].map(normalize_destination)
    destinations = frame[["_destination_key", "input__destination"]].drop_duplicates()
    exact = destinations[destinations["_destination_key"] == requested]
    matched_key = None
    if not exact.empty:
        matched_key = exact.iloc[0]["_destination_key"]
    else:
        # Support a user entering a shorter common form, e.g. "Alleppey".
        candidates = []
        for _, item in destinations.iterrows():
            key = item["_destination_key"]
            similarity = SequenceMatcher(None, requested, key).ratio()
            if requested in key or key in requested:
                similarity = max(similarity, 0.88)
            candidates.append((similarity, key))
        if candidates:
            score, key = max(candidates)
            if score >= 0.72:
                matched_key = key
    if not matched_key:
        suggestions = destinations["input__destination"].head(12).tolist()
        raise HTTPException(status_code=404, detail={
            "message": f"No dataset itinerary found for '{payload.destination}'.",
            "suggestions": suggestions
        })

    matching = frame[frame["_destination_key"] == matched_key].copy()
    # Dataset input fields repeat after forward fill; rank the single itinerary by interest overlap.
    row = matching.iloc[0]
    available_interests = _interest_values(row)
    requested_interests = {norm(value) for value in payload.interests if norm(value)}
    overlap = sorted(available_interests.intersection(requested_interests))
    interest_score = round((len(overlap) / len(requested_interests)) * 100, 1) if requested_interests else 0.0
    available_days = int(row["input__duration"])
    if payload.duration > available_days:
        raise HTTPException(status_code=422, detail={
            "message": f"The dataset has a {available_days}-day itinerary for {row['input__destination']}, but {payload.duration} days were requested.",
            "available_days": available_days,
            "requested_days": payload.duration
        })

    matching = matching.sort_values("output__optimized_itinerary__days__day")
    days = []
    for _, source_day in matching.head(payload.duration).iterrows():
        activities = []
        for period, column in [
            ("morning", "output__optimized_itinerary__days__morning"),
            ("afternoon", "output__optimized_itinerary__days__afternoon"),
            ("evening", "output__optimized_itinerary__days__evening"),
        ]:
            title = str(source_day.get(column) or "").strip()
            if title and title.casefold() != "nan":
                activities.append({"title": title, "period": period})
        days.append({
            "day_number": int(source_day["output__optimized_itinerary__days__day"]),
            "title": f"Day {int(source_day['output__optimized_itinerary__days__day'])}",
            "activities": activities
        })
    if not days or not any(day["activities"] for day in days):
        raise HTTPException(status_code=422, detail="The selected dataset itinerary has no usable activities.")
    return {
        "source": "tourism_iternary_dataset.csv",
        "destination": str(row["input__destination"]),
        "state": str(row["output__optimized_itinerary__state"]),
        "available_days": available_days,
        "requested_days": payload.duration,
        "matched_interests": overlap,
        "interest_match_score": interest_score,
        "days": days
    }

def items(value: Any) -> set[str]:
    if isinstance(value, list):
        return {str(x).strip().casefold() for x in value if str(x).strip()}
    if value is None:
        return set()
    return {x.strip().casefold() for x in str(value).split(",") if x.strip()}

def dates(a: dict, b: dict):
    try:
        a0, a1 = date.fromisoformat(str(a["start_date"])[:10]), date.fromisoformat(str(a["end_date"])[:10])
        b0, b1 = date.fromisoformat(str(b["start_date"])[:10]), date.fromisoformat(str(b["end_date"])[:10])
        if a1 < a0 or b1 < b0:
            return 0.0, 999.0, 999.0, 999.0
        overlap = max(0, (min(a1, b1) - max(a0, b0)).days + 1)
        da, db = (a1-a0).days+1, (b1-b0).days+1
        union = da + db - overlap
        return overlap / union if union else 0.0, abs((a0-b0).days), abs((a1-b1).days), abs(da-db)
    except (KeyError, TypeError, ValueError):
        return 0.0, 999.0, 999.0, 999.0

def pair_features(a: dict, b: dict) -> dict:
    aa, ab = items(a.get("preferred_activities")), items(b.get("preferred_activities"))
    union = aa | ab
    activity_similarity = len(aa & ab) / len(union) if union else 0.0
    date_iou, start_gap, end_gap, duration_gap = dates(a, b)
    try:
        ba, bb = float(a.get("budget") or 0), float(b.get("budget") or 0)
        budget_ratio = min(ba, bb) / max(ba, bb) if max(ba, bb) > 0 else 0.0
        budget_gap = abs(ba-bb)
    except (TypeError, ValueError):
        budget_ratio, budget_gap = 0.0, 0.0
    try:
        age_gap = abs(float(a.get("age") or 0) - float(b.get("age") or 0))
    except (TypeError, ValueError):
        age_gap = 0.0
    food_a, food_b = norm(a.get("food_preference")), norm(b.get("food_preference"))
    food_compatible = food_a == food_b or food_a in {"no preference", ""} or food_b in {"no preference", ""}
    experience = {"beginner": 0, "intermediate": 1, "experienced": 2}
    accommodation_a, accommodation_b = norm(a.get("accommodation")), norm(b.get("accommodation"))
    group_a, group_b = norm(a.get("group_size")), norm(b.get("group_size"))
    return {
        "same_destination": int(bool(normalize_destination(a.get("destination"))) and normalize_destination(a.get("destination")) == normalize_destination(b.get("destination"))),
        "date_overlap_iou": float(date_iou),
        "start_date_gap_days": float(start_gap),
        "end_date_gap_days": float(end_gap),
        "duration_gap_days": float(duration_gap),
        "budget_ratio": float(budget_ratio),
        "budget_gap": float(budget_gap),
        "age_gap": float(age_gap),
        "same_travel_style": int(bool(norm(a.get("travel_style"))) and norm(a.get("travel_style")) == norm(b.get("travel_style"))),
        "activities_jaccard": float(activity_similarity),
        "same_accommodation": int(bool(accommodation_a and accommodation_b) and accommodation_a == accommodation_b),
        "food_compatible": int(food_compatible),
        "same_group_size": int(bool(group_a and group_b) and group_a == group_b),
        "experience_gap": abs(experience.get(norm(a.get("travel_experience")), 1) - experience.get(norm(b.get("travel_experience")), 1)),
    }

def is_still_active(record: dict) -> bool:
    """A trip is active for matching through its end date, inclusive."""
    try:
        end = date.fromisoformat(str(record.get("end_date", ""))[:10])
        return end >= date.today()
    except (TypeError, ValueError):
        return False

def eligible(a: dict, b: dict) -> bool:
    # Keep the trained model and its 14-feature contract unchanged.
    # Trips may match after their start date, until their end date has passed.
    # This is an eligibility guard, not a model feature or retraining step.
    if not is_still_active(a) or not is_still_active(b):
        return False
    f = pair_features(a, b)
    return bool(f["same_destination"] and f["date_overlap_iou"] > 0 and str(a.get("traveller_id", "")) != str(b.get("traveller_id", "")))

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "travel-mate-ml",
        "model_exists": MODEL_PATH.exists(),
        "itinerary_dataset_exists": ITINERARY_DATASET_PATH.exists()
    }

@app.post("/generate-itinerary")
def generate_itinerary(payload: ItineraryRequest):
    try:
        return generate_dataset_itinerary(payload)
    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Itinerary generation unavailable: {exc}") from exc

@app.post("/rank")
def rank(payload: RankRequest, authorization: str | None = Header(default=None)):
    if ML_SERVICE_TOKEN and authorization != f"Bearer {ML_SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized ML service request")
    try:
        clf = model()
        rows, feature_rows = [], []
        for candidate in payload.candidates:
            if not eligible(payload.source, candidate):
                continue
            features = pair_features(payload.source, candidate)
            rows.append(candidate)
            feature_rows.append(features)
        if not rows:
            return {"engine": "random_forest", "eligible_count": 0, "results": [],
                    "score_note": "Confidence for the synthetic higher-compatibility label; not trip-success probability."}
        frame = pd.DataFrame(feature_rows)
        probabilities = clf.predict_proba(frame)
        classes = list(clf.classes_)
        if "higher" not in classes:
            raise RuntimeError("Trained model does not contain the 'higher' class")
        scores = probabilities[:, classes.index("higher")]
        predictions = clf.predict(frame)
        ranked = []
        for candidate, features, score, prediction in zip(rows, feature_rows, scores, predictions):
            ranked.append({
                "trip_id": candidate.get("trip_id"),
                "traveller_id": candidate.get("traveller_id"),
                "score": round(float(score) * 100, 1),
                "predicted_label": str(prediction),
                "features": features,
            })
        ranked.sort(key=lambda item: (-item["score"], str(item.get("trip_id") or "")))
        return {"engine": "random_forest", "eligible_count": len(ranked),
                "results": ranked[:payload.top_n],
                "score_note": "Model confidence for the synthetic 'higher' label; not a probability of real-world trip success.",
                "feature_limitations": ["The current Supabase schema does not store age, accommodation, food preference, group size, or travel experience. Those model inputs use neutral defaults until those fields are added to traveller profiles/trips."]}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"ML prediction unavailable: {exc}") from exc
