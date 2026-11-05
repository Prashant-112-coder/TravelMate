# Travel Mate Matching ML Service

This service is intentionally kept separate from the Node.js baseline matcher.

## Current state

The production app uses the deterministic **baseline** matcher in:

`backend/src/services/matchingEngine.js`

It produces the feature vector that the future ML model will consume:

- destination_similarity
- date_overlap
- budget_similarity
- style_similarity
- interests_similarity
- activities_similarity

The application records real interaction outcomes in the Supabase `matching_events` table.

## Future ML switch

When enough labelled interaction data is available:

1. Export or query `matching_events`.
2. Build a training dataset from `request_sent` rows and their later outcomes.
3. Train and evaluate candidate models such as Logistic Regression and Random Forest.
4. Keep a held-out test set and record precision/recall/F1 and calibration where appropriate.
5. Expose a prediction endpoint with the same feature contract.
6. Validate the ML model against the baseline.
7. Set `MATCHING_ENGINE=ml` only after the model service is deployed and validated.

The frontend API contract should remain unchanged. The backend can switch the ranking implementation without rebuilding the Discover UI.

## Important

Do not report synthetic-data performance as real-world matching accuracy. Synthetic data is only for pipeline development when real interaction data is insufficient.


## Dataset-powered day-wise itinerary generation

The same FastAPI service also exposes `POST /generate-itinerary`. It does not alter the Random Forest `/rank` endpoint.

### Dataset file

Place the supplied tourism itinerary CSV at:

`python-service/data/tourism_iternary_dataset.csv`

The loader expects the original 12-column dataset, including the five `input__interests__NNN` columns and the day/morning/afternoon/evening output columns. The file contains continuation rows with blank destination/input fields; the loader forward-fills those input values so every day belongs to its parent itinerary.

### Request

```json
{
  "destination": "Goa",
  "duration": 3,
  "interests": ["beach", "nightlife"]
}
```

### Response shape

```json
{
  "source": "tourism_iternary_dataset.csv",
  "destination": "Goa",
  "requested_days": 3,
  "matched_interests": ["beach", "nightlife"],
  "interest_match_score": 100.0,
  "days": [
    {
      "day_number": 1,
      "title": "Day 1",
      "activities": [
        { "title": "Relax at Calangute Beach", "period": "morning" }
      ]
    }
  ]
}
```

Activities from the dataset's morning, afternoon and evening source columns are combined into one ordered list for each day. The period is retained only for the database's legacy required column; the web interface shows day cards and does not display time-of-day sections.

The generator uses the destination's dataset itinerary and reports exact interest overlap. The current file has one itinerary per destination, so interests are measured and reported rather than used to choose between multiple alternative plans. If the requested duration is longer than the dataset itinerary, the endpoint returns HTTP 422 instead of inventing extra activities. Existing saved journey activities are protected from accidental overwrite.
