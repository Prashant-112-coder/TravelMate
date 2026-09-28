# Travel Mate – A Smart Traveller Matching Platform for Solo Travellers

Production-style MCA major project.

## Architecture
1. User / Presentation Layer — React + Vite
2. Application / Business Logic Layer — Node.js + Express
3. Data / Intelligence / Service Layer — matching, feature engineering, recommendation
4. Storage / Infrastructure Layer — Supabase PostgreSQL/Auth/Storage, deployment

## Repository
- frontend/ React + Vite
- backend/ Express REST API
- supabase/ migrations
- python-service/ optional ML/recommendation service
- docs/ architecture, database, testing, academic documentation
- tests/ cross-layer tests

## Local setup
Copy `.env.example` files into local environment files. Never commit secrets.

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npm run dev
```
