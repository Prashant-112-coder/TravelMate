import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";
import { compareTrips } from "../services/matchingEngine.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  trip_id: z.string().uuid(),
  source_trip_id: z.string().uuid().optional(),
  message: z.string().trim().max(1000).optional(),
});

async function logMatchingEvent(db, payload) {
  const { error } = await db.from("matching_events").insert(payload);
  if (error) console.warn("Matching event logging skipped:", error.message);
}

async function getTripPair(db, request) {
  const [candidateResult, sourceResult] = await Promise.all([
    db.from("trips").select("*").eq("id", request.trip_id).maybeSingle(),
    request.source_trip_id
      ? db.from("trips").select("*").eq("id", request.source_trip_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    candidateTrip: candidateResult.data || null,
    sourceTrip: sourceResult.data || null,
  };
}

router.get("/", async (req, res) => {
  const db = createUserClient(req.accessToken);
  const { data, error } = await db
    .from("match_requests")
    .select("*, trip:trips(id,title,destination,start_date,end_date,user_id), source_trip:trips!match_requests_source_trip_id_fkey(id,title,destination,start_date,end_date,user_id)")
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const ids = [...new Set((data || []).flatMap((item) => [item.sender_id, item.receiver_id]))];
  const profiles = ids.length
    ? await db.from("profiles").select("id,display_name,avatar_url,home_city").in("id", ids)
    : { data: [] };

  const profileMap = new Map((profiles.data || []).map((profile) => [profile.id, profile]));
  res.json({
    requests: (data || []).map((item) => ({
      ...item,
      sender: profileMap.get(item.sender_id),
      receiver: profileMap.get(item.receiver_id),
    })),
  });
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request." });

  const db = createUserClient(req.accessToken);

  const { data: candidateTrip, error: tripError } = await db
    .from("trips")
    .select("*")
    .eq("id", parsed.data.trip_id)
    .single();

  if (tripError || !candidateTrip || candidateTrip.status !== "open") {
    return res.status(400).json({ error: "That trip is no longer open." });
  }

  if (candidateTrip.user_id === req.user.id) {
    return res.status(400).json({ error: "You cannot request your own trip." });
  }

  let sourceTrip = null;
  if (parsed.data.source_trip_id) {
    const sourceResult = await db
      .from("trips")
      .select("*")
      .eq("id", parsed.data.source_trip_id)
      .eq("user_id", req.user.id)
      .single();

    if (sourceResult.error || !sourceResult.data) {
      return res.status(400).json({ error: "Your selected matching trip was not found." });
    }
    sourceTrip = sourceResult.data;

    const match = compareTrips(sourceTrip, candidateTrip);
    if (!match.features.destination_similarity || !match.features.date_overlap) {
      return res.status(400).json({ error: "This trip does not satisfy the matching destination and date requirements." });
    }
  }

  const { data, error } = await db
    .from("match_requests")
    .insert({
      trip_id: candidateTrip.id,
      source_trip_id: sourceTrip?.id || null,
      sender_id: req.user.id,
      receiver_id: candidateTrip.user_id,
      message: parsed.data.message || null,
    })
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({
      error: error.code === "23505" ? "You already sent a request for this trip." : error.message,
    });
  }

  if (sourceTrip) {
    const match = compareTrips(sourceTrip, candidateTrip);
    await logMatchingEvent(db, {
      actor_id: req.user.id,
      candidate_id: candidateTrip.user_id,
      source_trip_id: sourceTrip.id,
      candidate_trip_id: candidateTrip.id,
      event_type: "request_sent",
      destination_similarity: match.features.destination_similarity,
      date_overlap: match.features.date_overlap,
      budget_similarity: match.features.budget_similarity,
      style_similarity: match.features.style_similarity,
      interests_similarity: match.features.interests_similarity,
      activities_similarity: match.features.activities_similarity,
      baseline_score: match.score,
      metadata: { request_id: data.id, engine: "baseline" },
    });
  }

  res.status(201).json({ request: data });
});

router.patch("/:id", async (req, res) => {
  const status = z.enum(["accepted", "declined", "cancelled"]).safeParse(req.body.status);
  if (!status.success) return res.status(400).json({ error: "Invalid status." });

  const db = createUserClient(req.accessToken);
  const { data: request, error: requestError } = await db
    .from("match_requests")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (requestError || !request) return res.status(404).json({ error: "Request not found." });

  if (status.data === "accepted" && request.receiver_id !== req.user.id) {
    return res.status(403).json({ error: "Only the recipient can accept a request." });
  }
  if (status.data === "declined" && request.receiver_id !== req.user.id) {
    return res.status(403).json({ error: "Only the recipient can decline a request." });
  }
  if (status.data === "cancelled" && request.sender_id !== req.user.id) {
    return res.status(403).json({ error: "Only the sender can cancel a request." });
  }

  const { data: updated, error } = await db
    .from("match_requests")
    .update({ status: status.data })
    .eq("id", request.id)
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const { candidateTrip, sourceTrip } = await getTripPair(db, request);
  const match = sourceTrip && candidateTrip ? compareTrips(sourceTrip, candidateTrip) : null;

  await logMatchingEvent(db, {
    actor_id: req.user.id,
    candidate_id: request.sender_id === req.user.id ? request.receiver_id : request.sender_id,
    source_trip_id: sourceTrip?.id || null,
    candidate_trip_id: candidateTrip?.id || request.trip_id,
    event_type: `request_${status.data}`,
    destination_similarity: match?.features.destination_similarity ?? null,
    date_overlap: match?.features.date_overlap ?? null,
    budget_similarity: match?.features.budget_similarity ?? null,
    style_similarity: match?.features.style_similarity ?? null,
    interests_similarity: match?.features.interests_similarity ?? null,
    activities_similarity: match?.features.activities_similarity ?? null,
    baseline_score: match?.score ?? null,
    metadata: { request_id: request.id, engine: "baseline" },
  });

  if (status.data === "accepted") {
    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .insert({ request_id: request.id })
      .select("*")
      .single();

    if (conversationError && conversationError.code !== "23505") {
      return res.status(400).json({ error: conversationError.message });
    }

    return res.json({ request: updated, conversation: conversation || null });
  }

  return res.json({ request: updated });
});

export default router;
