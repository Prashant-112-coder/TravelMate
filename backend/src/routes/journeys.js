import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const db = createUserClient(req.accessToken);
  const { data, error } = await db.from("journeys")
    .select("*, members:journey_members(user_id,role,profile:profiles(id,display_name,avatar_url,home_city))")
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ journeys: data || [] });
});

router.get("/:id", async (req, res) => {
  const db = createUserClient(req.accessToken);
  const { data: journey, error } = await db.from("journeys")
    .select("*, members:journey_members(user_id,role,profile:profiles(id,display_name,avatar_url,home_city))")
    .eq("id", req.params.id).single();
  if (error || !journey) return res.status(404).json({ error: "Journey not found or you are not a member." });
  const { data: itinerary, error: itineraryError } = await db.from("journey_itineraries")
    .select("*, days:itinerary_days(*,activities:itinerary_activities(*))")
    .eq("journey_id", journey.id).maybeSingle();
  if (itineraryError) return res.status(400).json({ error: itineraryError.message });
  res.json({ journey, itinerary: itinerary || null });
});

router.post("/:id/itinerary", async (req, res) => {
  const db = createUserClient(req.accessToken);
  const { data: journey, error: journeyError } = await db.from("journeys")
    .select("id,start_date,end_date").eq("id", req.params.id).single();
  if (journeyError || !journey) return res.status(404).json({ error: "Journey not found." });

  let { data: itinerary, error } = await db.from("journey_itineraries")
    .upsert({ journey_id: journey.id, created_by: req.user.id }, { onConflict: "journey_id", ignoreDuplicates: true })
    .select("*").maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!itinerary) {
    const found = await db.from("journey_itineraries").select("*").eq("journey_id", journey.id).single();
    if (found.error) return res.status(400).json({ error: found.error.message });
    itinerary = found.data;
  }

  const { count } = await db.from("itinerary_days")
    .select("id", { count: "exact", head: true }).eq("itinerary_id", itinerary.id);
  if (!count) {
    const start = new Date(journey.start_date || new Date().toISOString().slice(0, 10));
    const end = new Date(journey.end_date || start);
    const totalDays = Math.max(1, Math.min(30, Math.round((end - start) / 86400000) + 1));
    const rows = Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        itinerary_id: itinerary.id,
        day_number: index + 1,
        day_date: date.toISOString().slice(0, 10),
        title: `Day ${index + 1}`
      };
    });
    const inserted = await db.from("itinerary_days").insert(rows);
    if (inserted.error) return res.status(400).json({ error: inserted.error.message });
  }
  return res.status(201).json({ itinerary });
});

router.post("/:id/activities", async (req, res) => {
  const parsed = z.object({
    day_id: z.string().uuid(),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid day and an activity title (at least 2 characters)." });
  }

  const db = createUserClient(req.accessToken);
  // The existing database has a required legacy period column. Keep its value internal
  // so the API and traveller-facing itinerary are fully day-based.
  const { data, error } = await db.from("itinerary_activities")
    .insert({
      ...parsed.data,
      period: "morning",
      description: parsed.data.description || null,
      source: "manual"
    })
    .select("*").single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ activity: data });
});


router.post("/:id/generate-itinerary", async (req, res) => {
  const parsed = z.object({
    interests: z.array(z.string().trim().min(1).max(50)).max(5).default([]),
    duration: z.coerce.number().int().min(1).max(30).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Choose up to five valid travel interests." });
  }

  const db = createUserClient(req.accessToken);
  const { data: journey, error: journeyError } = await db.from("journeys")
    .select("id,destination,start_date,end_date")
    .eq("id", req.params.id).single();
  if (journeyError || !journey) {
    return res.status(404).json({ error: "Journey not found or you are not a member." });
  }

  let duration = parsed.data.duration;
  if (journey.start_date && journey.end_date) {
    const start = new Date(`${journey.start_date}T00:00:00Z`);
    const end = new Date(`${journey.end_date}T00:00:00Z`);
    duration = Math.floor((end - start) / 86400000) + 1;
  }
  if (!duration || duration < 1 || duration > 30) {
    return res.status(400).json({ error: "Set valid journey dates or provide a trip duration between 1 and 30 days." });
  }

  let generated;
  try {
    const response = await fetch(`${process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"}/generate-itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: journey.destination,
        duration,
        interests: parsed.data.interests
      }),
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body.detail;
      const message = typeof detail === "string" ? detail : detail?.message || "The dataset could not generate this itinerary.";
      return res.status(response.status === 404 ? 404 : response.status === 422 ? 422 : 503)
        .json({ error: message, details: detail });
    }
    generated = body;
  } catch (error) {
    return res.status(503).json({
      error: error.name === "TimeoutError"
        ? "The itinerary service took too long. Make sure the Python service is running."
        : "Cannot reach the Python itinerary service. Start it on port 8000 and try again."
    });
  }

  let { data: itinerary, error: itineraryError } = await db.from("journey_itineraries")
    .upsert({ journey_id: journey.id, created_by: req.user.id }, { onConflict: "journey_id", ignoreDuplicates: true })
    .select("*").maybeSingle();
  if (itineraryError) return res.status(400).json({ error: itineraryError.message });
  if (!itinerary) {
    const found = await db.from("journey_itineraries").select("*").eq("journey_id", journey.id).single();
    if (found.error) return res.status(400).json({ error: found.error.message });
    itinerary = found.data;
  }

  const { data: oldDays, error: daysError } = await db.from("itinerary_days")
    .select("id").eq("itinerary_id", itinerary.id);
  if (daysError) return res.status(400).json({ error: daysError.message });
  const oldDayIds = (oldDays || []).map(day => day.id);
  if (oldDayIds.length) {
    const { count, error: activityCheckError } = await db.from("itinerary_activities")
      .select("id", { count: "exact", head: true }).in("day_id", oldDayIds);
    if (activityCheckError) return res.status(400).json({ error: activityCheckError.message });
    if (count > 0) {
      return res.status(409).json({
        error: "This journey already has activities. Existing manual or generated plans were kept safe; remove them before generating a replacement."
      });
    }
    const removed = await db.from("itinerary_days").delete().in("id", oldDayIds);
    if (removed.error) return res.status(400).json({ error: removed.error.message });
  }

  const startDate = journey.start_date || new Date().toISOString().slice(0, 10);
  const dayRows = generated.days.map(day => {
    const dayDate = new Date(`${startDate}T00:00:00Z`);
    dayDate.setUTCDate(dayDate.getUTCDate() + day.day_number - 1);
    return {
      itinerary_id: itinerary.id,
      day_number: day.day_number,
      day_date: dayDate.toISOString().slice(0, 10),
      title: `Day ${day.day_number}`
    };
  });
  const insertedDays = await db.from("itinerary_days").insert(dayRows).select("id,day_number");
  if (insertedDays.error) return res.status(400).json({ error: insertedDays.error.message });

  const dayIdByNumber = new Map(insertedDays.data.map(day => [day.day_number, day.id]));
  const activityRows = generated.days.flatMap(day => day.activities.map((activity, index) => ({
    day_id: dayIdByNumber.get(day.day_number),
    period: activity.period,
    title: activity.title,
    description: "Suggested from the Travel Mate tourism itinerary dataset.",
    source: "dataset",
    sort_order: index + 1
  })));
  if (activityRows.length) {
    const insertedActivities = await db.from("itinerary_activities").insert(activityRows);
    if (insertedActivities.error) {
      await db.from("itinerary_days").delete().in("id", insertedDays.data.map(day => day.id));
      return res.status(400).json({ error: insertedActivities.error.message });
    }
  }

  return res.status(201).json({
    message: "Dataset itinerary generated successfully.",
    itinerary,
    generation: {
      destination: generated.destination,
      state: generated.state,
      interest_match_score: generated.interest_match_score,
      matched_interests: generated.matched_interests,
      days: generated.days.length,
      activities: activityRows.length,
      source: generated.source
    }
  });
});

export default router;
