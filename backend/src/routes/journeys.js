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

export default router;
