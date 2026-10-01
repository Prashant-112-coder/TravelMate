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
