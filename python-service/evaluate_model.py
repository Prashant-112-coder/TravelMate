"""Evaluate the saved Travel Mate Random Forest on labelled traveller pairs.

Expected CSV:
- One row per traveller pair.
- Feature columns matching pair_features() in main.py.
- compatibility_label column containing 'higher' or 'lower'.

This script evaluates the existing saved model; it does not invent labels or
train on the tourism itinerary dataset. Use genuinely labelled pair outcomes.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "traveller_pair_random_forest.joblib"
FEATURE_COLUMNS = [
    "same_destination",
    "date_overlap_iou",
    "start_date_gap_days",
    "end_date_gap_days",
    "duration_gap_days",
    "budget_ratio",
    "budget_gap",
    "age_gap",
    "same_travel_style",
    "activities_jaccard",
    "same_accommodation",
    "food_compatible",
    "same_group_size",
    "experience_gap",
]
TARGET_COLUMN = "compatibility_label"
VALID_LABELS = {"higher", "lower"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Travel Mate Random Forest.")
    parser.add_argument(
        "--data",
        default=str(ROOT / "data" / "labelled_traveller_pairs.csv"),
        help="CSV containing pair features and compatibility_label.",
    )
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_file():
        raise SystemExit(
            f"Labelled dataset not found: {data_path}\n"
            "Create a CSV of genuinely labelled traveller pairs. "
            "Do not use tourism_iternary_dataset.csv for this task."
        )
    if not 0.0 < args.test_size < 1.0:
        raise SystemExit("--test-size must be between 0 and 1.")

    frame = pd.read_csv(data_path)
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise SystemExit(f"CSV is missing required columns: {', '.join(missing)}")

    frame = frame[required].dropna()
    frame[TARGET_COLUMN] = frame[TARGET_COLUMN].astype(str).str.strip().str.lower()
    unexpected = sorted(set(frame[TARGET_COLUMN]) - VALID_LABELS)
    if unexpected:
        raise SystemExit(
            "compatibility_label must contain only 'higher' or 'lower'. "
            f"Unexpected values: {unexpected}"
        )
    if frame[TARGET_COLUMN].nunique() != 2:
        raise SystemExit("Both 'higher' and 'lower' labels are required.")
    if frame[TARGET_COLUMN].value_counts().min() < 2:
        raise SystemExit("At least two examples of each label are required for stratified splitting.")

    X = frame[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce")
    y = frame[TARGET_COLUMN]
    valid_rows = X.notna().all(axis=1)
    X, y = X.loc[valid_rows], y.loc[valid_rows]
    if y.value_counts().min() < 2:
        raise SystemExit("Not enough valid rows per class after numeric feature validation.")

    _, X_test, _, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y,
    )

    if not MODEL_PATH.is_file():
        raise SystemExit(f"Saved model not found: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted", zero_division=0
    )

    print("\nTRAVEL MATE RANDOM FOREST — HELD-OUT EVALUATION")
    print(f"Dataset: {data_path}")
    print(f"Usable labelled pairs: {len(X)}")
    print(f"Test records: {len(X_test)} ({args.test_size:.0%})")
    print(f"Training reference split: {1 - args.test_size:.0%}")
    print(f"Random state: {args.random_state}")
    print(f"Accuracy:  {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print("\nConfusion matrix (labels: lower, higher):")
    print(confusion_matrix(y_test, y_pred, labels=["lower", "higher"]))
    print("\nClassification report:")
    print(classification_report(y_test, y_pred, labels=["lower", "higher"], zero_division=0))
    print(
        "\nNOTE: This is a valid estimate only if labels are independently verified "
        "and the test pairs are independent of training data. For repeated travellers, "
        "prefer a group-based split by traveller IDs to prevent leakage."
    )


if __name__ == "__main__":
    main()
