# Travel Mate itinerary generation

## API

All endpoints require the existing Supabase bearer-token authentication.

- `GET /api/itinerary/destinations` — list supported destination records.
- `POST /api/itinerary/generate` — generate a day-wise itinerary.

Example request:

```json
{
  "destination": "Goa",
  "travel_date": "2026-12-10",
  "days": 3,
  "travelers": 2,
  "total_budget": 30000,
  "interests": ["Beach", "Food"]
}
```

The response contains a destination recommendation score, score breakdown, day plan, estimated budget, destination context and data-source notes.

## Data

- `backend/src/data/indian-tourism-destinations.json` is the 100-record Indian Tourism Dataset from SafeTrip-AI. It supplies destination/state names, attraction lists, activities, popularity, season guidance, budget bands, safety notes and destination context.
- `backend/src/data/india-weather-climatology.csv` is the India-wide 1901–2017 monthly climatology file from SafeTrip-AI. The current implementation surfaces its 2017 national monthly mean as historical context only; it is not a local forecast.
- Attraction scheduling is a lightweight adaptation of the recommendation/scheduling approach in SafeTrip-AI. The source tourism dataset does not provide reliable per-attraction opening hours or attraction-level coordinates, so the planner does not invent them. It prompts travellers to verify current hours, ticket prices and local access.

The SafeTrip-AI Tourist Arrivals workbook is not used in this first iteration: it is an XLS binary source and the current Node service does not parse it. It is also national historical arrival data rather than a current destination-level crowd forecast. The repository does not contain a separate "Top Indian Places" file; the tourism dataset's `primary_attractions` and `hidden_gems` are used instead. Road-accident and crime datasets are deliberately excluded.

## Algorithm

1. Match the requested destination against destination, state, district and nearby-city fields in the tourism dataset.
2. Score interest match (45%), popularity (25%), seasonal suitability (15%) and budget fit (15%).
3. Build a simple day-wise schedule from primary attractions and hidden gems (up to three suggestions per day).
4. Estimate a daily budget range from the dataset's budget tier and scale it by days and travellers.

This is a deterministic, explainable recommendation engine; it is not a newly trained ML model. The existing traveller matching engine is not changed.

## Local verification

From `backend/` run:

```bash
npm test
npm run lint
```

From `frontend/` run:

```bash
npm run build
```
