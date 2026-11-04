from __future__ import annotations

import os
from datetime import date
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "traveller_pair_random_forest.joblib"
ML_SERVICE_TOKEN = os.getenv("ML_SERVICE_TOKEN", "")

app = FastAPI(title="Travel Mate Random Forest Matching API", version="1.0.0")
_model = None

class RankRequest(BaseModel):
    source: dict[str, Any]
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    top_n: int = Field(default=30, ge=1, le=100)

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
    """Normalize destination spelling, case, punctuation and a trailing country name."""
    import re
    text = norm(value)
    text = re.sub(r"[^\w]+", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text).strip()
    # Treat common country-qualified entries (for example, 'Goa, India') as the city/place.
    text = re.sub(r"\s+india$", "", text).strip()
    return text

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

def eligible(a: dict, b: dict) -> bool:
    f = pair_features(a, b)
    return bool(f["same_destination"] and f["date_overlap_iou"] > 0 and str(a.get("traveller_id", "")) != str(b.get("traveller_id", "")))

@app.get("/health")
def health():
    return {"ok": True, "service": "travel-mate-ml", "model_exists": MODEL_PATH.exists()}

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
