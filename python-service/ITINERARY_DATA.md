# Dataset-driven itinerary generation

The itinerary engine is implemented in `itinerary_engine.py` and exposed through the existing `POST /generate-itinerary` endpoint.

## Required destination data

Place the Indian Tourism Dataset JSON at:

`python-service/data/india_tourism_dataset.json`

Source: https://github.com/sainath4501/SafeTrip-AI/tree/main/Dataset/Indian%20Tourism%20Dataset

The source repository currently has no visible LICENSE file. Check the dataset's reuse terms before committing or redistributing a copy. The dataset is intentionally not vendored into this repository.

## Optional attraction catalogue

Place the original Kaggle file at:

`python-service/data/top_indian_places.csv`

Expected source file name: `Top Indian Places to Visit.csv`

Source referenced by the SafeTrip-AI notebook: https://www.kaggle.com/datasets


The loader recognizes the columns used by that notebook, including Name, City, State, Type, Time needed to visit in hrs, Google review rating, Entrance Fee in INR, Weekly Off and Best Time to visit. The attraction CSV is optional; without it, the engine uses primary attractions, hidden gems and activities in the destination JSON. In that fallback mode, per-attraction ratings, fees, opening hours and exact routes are not available.

## Generation behaviour

- Matches a destination against the tourism JSON.
- Ranks available attractions by interest relevance, rating/popularity where available, and budget fit.
- Distributes selected attractions across Day 1, Day 2, etc.
- Uses attraction visit duration, best-time and weekly-off fields when supplied.
- Returns destination budget ranges and historical seasonal context.
- Does not claim live weather, verified current opening hours, or precise inter-attraction distances. Those require live data/geocoding/routing integrations.

This is a content-based recommendation and scheduling engine, not a newly trained supervised ML model. The existing Random Forest traveller-matching model and `/rank` endpoint remain separate and unchanged.
