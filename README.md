# Travel Mate – A Smart Traveller Matching Platform for Solo Travellers

A production-style MCA major project that helps solo travellers discover compatible trips and connect with other travellers.

## Architecture

1. **Presentation:** React + Vite
2. **Business logic:** Node.js + Express REST API
3. **Matching and intelligence:** Explainable compatibility scoring, with an optional Python recommendation service
4. **Storage and infrastructure:** Supabase PostgreSQL, Auth, and Storage

## Repository layout

- `frontend/` — React application
- `backend/` — Express API, authentication middleware, trip and connection routes
- `supabase/migrations/` — versioned database migrations and policies
- `python-service/` — optional recommendation-service documentation
- `docs/` — project documentation as it is added

## Requirements

- Node.js 20 or newer (Node.js 22 LTS recommended)
- npm
- A Supabase project for authentication and database features

## Configuration

Create local environment files from the examples. Never commit real credentials or local `.env` files.

### Backend

From the repository root:

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and configure:

- `PORT` — API port (defaults to `5000`)
- `CLIENT_ORIGIN` — exact frontend origin allowed by CORS (defaults to `http://localhost:5173`)
- `NODE_ENV` — `development`, `test`, or `production`
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable key
- `MATCHING_ENGINE` — `baseline` by default; `ml` only when the optional ML integration is configured

Start the API:

```bash
npm run dev
```

Check that it is running at [http://localhost:5000/health](http://localhost:5000/health).

### Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_BASE_URL` (for local development, `http://localhost:5000/api`).

Start the Vite development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually [http://localhost:5173](http://localhost:5173).

## Tests and quality checks

Run the backend tests:

```bash
cd backend
npm test
```

Run backend linting:

```bash
npm run lint
```

Build the frontend for production:

```bash
cd frontend
npm run build
```

## Security notes

- Keep backend `.env` files and service-role credentials out of Git.
- Only use the Supabase publishable key in browser configuration; never expose a service-role key to the frontend.
- Apply the SQL migrations in order in the intended Supabase project.
- Configure `CLIENT_ORIGIN` to the deployed frontend origin before production use.
