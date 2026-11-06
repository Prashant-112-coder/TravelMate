import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";
import { env } from "../config/env.js";
import { matchingEngineName, rankCandidates } from "../services/matchingEngine.js";

const router = Router();
router.use(requireAuth);

function toModelRecord(trip, profile, userId) {
  const budgetMin = trip.budget_min == null ? null : Number(trip.budget_min);
  const budgetMax = trip.budget_max == null ? null : Number(trip.budget_max);
  const budget = budgetMin != null && budgetMax != null
    ? (budgetMin + budgetMax) / 2
    : budgetMax ?? budgetMin ?? 0;

  return {
    traveller_id: userId,
    trip_id: trip.id,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    budget,
    travel_style: trip.travel_style || profile?.travel_style || "",
    preferred_activities: [...new Set([
      ...(Array.isArray(trip.activities) ? trip.activities : []),
      ...(Array.isArray(profile?.activities) ? profile.activities : []),
    ])],
    // These fields are not in the current Supabase schema. The Python model
    // uses conservative defaults until the app collects them from users.
    age: null,
    accommodation: "",
    food_preference: "No Preference",
    group_size: "",
    travel_experience: "",
  };
}

async function discoverWithML({ sourceTrip, sourceProfile, candidates, req, db }) {
  const source = toModelRecord(sourceTrip, sourceProfile, req.user.id);
  const candidateRecords = candidates.map(({ trip, profile }) =>
    toModelRecord(trip, profile, trip.user_id)
  );

  let response;
  try {
    response = await fetch(`${env.ML_SERVICE_URL.replace(/\/$/, "")}/rank`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.ML_SERVICE_TOKEN ? { authorization: `Bearer ${env.ML_SERVICE_TOKEN}` } : {}),
      },
      body: JSON.stringify({ source, candidates: candidateRecords, top_n: 30 }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("ML service connection failed:", error.message);
    return { error: "The ML matching service is not reachable. Start the Python service and try again.", status: 503 };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("ML service returned an error:", payload.detail || response.statusText);
    return { error: payload.detail || "ML prediction failed.", status: response.status === 401 ? 503 : response.status };
  }

  const candidateByTripId = new Map(candidates.map((item) => [item.trip.id, item]));
  const results = (payload.results || []).map((match) => {
    const item = candidateByTripId.get(match.trip_id);
    if (!item) return null;
    const f = match.features || {};
    return {
      trip: item.trip,
      profile: item.profile,
      compatibility: match.score,
      predicted_label: match.predicted_label,
      features: f,
      score_note: payload.score_note,
      feature_limitations: payload.feature_limitations || [],
    };
  }).filter(Boolean);

  if (results.length) {
    const events = results.map((item) => ({
      actor_id: req.user.id,
      candidate_id: item.profile.id,
      source_trip_id: sourceTrip.id,
      candidate_trip_id: item.trip.id,
      event_type: "impression",
      destination_similarity: 1,
      date_overlap: item.features.date_overlap_iou,
      budget_similarity: item.features.budget_ratio,
      style_similarity: item.features.same_travel_style,
      activities_similarity: item.features.activities_jaccard,
      baseline_score: item.compatibility,
      metadata: { engine: "ml", source: "discover", predicted_label: item.predicted_label },
    }));
    const eventResult = await db.from("matching_events").insert(events);
    if (eventResult.error) console.warn("ML impression logging skipped:", eventResult.error.message);
  }

  return {
    engine: "ml",
    score_note: payload.score_note,
    feature_limitations: payload.feature_limitations || [],
    eligible_count: payload.eligible_count || 0,
    results,
  };
}

router.get("/", async (req, res) => {
  if (!req.query.tripId) {
    return res.status(400).json({ error: "tripId is required to calculate compatibility." });
  }

  const db = createUserClient(req.accessToken);
  const ownResult = await db
    .from("trips")
    .select("*")
    .eq("id", req.query.tripId)
    .eq("user_id", req.user.id)
    .single();

  if (ownResult.error || !ownResult.data) {
    return res.status(404).json({ error: "Your trip was not found." });
  }

  // Only future-starting trips can participate in active traveller matching.
  // Past trips remain visible in Explore Trips; this guard affects matching only.
  const today = new Date().toISOString().slice(0, 10);
  if (ownResult.data.status !== "open" || !ownResult.data.start_date || ownResult.data.start_date < today) {
    return res.json({
      engine: matchingEngineName(),
      eligible_count: 0,
      results: [],
      message: "This trip has already started or is not open for discovery. Past trips remain available in Explore Trips.",
    });
  }

  const { data: trips, error: tripsError } = await db
    .from("trips")
    .select("*")
    .eq("status", "open")
    .gte("start_date", today)
    .neq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (tripsError) return res.status(400).json({ error: tripsError.message });

  const ids = [...new Set((trips || []).map((trip) => trip.user_id))];
  let profiles = [];

  if (ids.length) {
    const profileResult = await db
      .from("profiles")
      .select("id,display_name,avatar_url,background_url,bio,home_city,travel_style,interests,activities,is_discoverable")
      .in("id", ids);

    if (profileResult.error) return res.status(400).json({ error: profileResult.error.message });
    profiles = profileResult.data || [];
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const candidates = (trips || [])
    .map((trip) => ({ trip, profile: profileMap.get(trip.user_id) || null }))
    .filter((item) => item.profile?.is_discoverable !== false);

  if (matchingEngineName() === "ml") {
    const mlResult = await discoverWithML({
      sourceTrip: ownResult.data,
      sourceProfile: profileMap.get(req.user.id) || null,
      candidates,
      req,
      db,
    });
    if (mlResult.error) return res.status(mlResult.status).json({ error: mlResult.error });
    return res.json(mlResult);
  }

  const ranked = rankCandidates(ownResult.data, candidates.map((item) => item.trip));
  const rankedById = new Map(ranked.map((item) => [item.candidate.id, item]));
  const results = candidates.map((item) => {
    const match = rankedById.get(item.trip.id);
    if (!match) return null;
    return {
      trip: item.trip,
      profile: item.profile,
      compatibility: match.score,
      breakdown: match.breakdown,
      features: match.features,
      missing: match.missing,
    };
  }).filter(Boolean);

  if (results.length) {
    const events = results.slice(0, 30).map((item) => ({
      actor_id: req.user.id,
      candidate_id: item.profile.id,
      source_trip_id: ownResult.data.id,
      candidate_trip_id: item.trip.id,
      event_type: "impression",
      destination_similarity: item.features.destination_similarity,
      date_overlap: item.features.date_overlap,
      budget_similarity: item.features.budget_similarity,
      style_similarity: item.features.style_similarity,
      interests_similarity: item.features.interests_similarity,
      activities_similarity: item.features.activities_similarity,
      baseline_score: item.compatibility,
      metadata: { engine: "baseline", source: "discover" },
    }));
    const eventResult = await db.from("matching_events").insert(events);
    if (eventResult.error) console.warn("Matching event logging skipped:", eventResult.error.message);
  }

  res.json({
    engine: "baseline",
    weights: { destination: 30, dates: 25, budget: 15, travelStyle: 10, interests: 10, activities: 10 },
    results,
  });
});

export default router;
