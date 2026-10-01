import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";
import { matchingEngineName, rankCandidates } from "../services/matchingEngine.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  if (!req.query.tripId) {
    return res.status(400).json({ error: "tripId is required to calculate compatibility." });
  }

  if (matchingEngineName() === "ml") {
    return res.status(503).json({
      error: "The ML matching engine is not trained yet. Keep MATCHING_ENGINE=baseline until a validated model is available.",
    });
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

  const { data: trips, error: tripsError } = await db
    .from("trips")
    .select("*")
    .eq("status", "open")
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

  const ranked = rankCandidates(ownResult.data, candidates.map((item) => item.trip));

  const rankedById = new Map(ranked.map((item) => [item.candidate.id, item]));
  const results = candidates
    .map((item) => {
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
    })
    .filter(Boolean);

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
    if (eventResult.error) {
      console.warn("Matching event logging skipped:", eventResult.error.message);
    }
  }

  res.json({
    engine: "baseline",
    weights: {
      destination: 30,
      dates: 25,
      budget: 15,
      travelStyle: 10,
      interests: 10,
      activities: 10,
    },
    results,
  });
});

export default router;
