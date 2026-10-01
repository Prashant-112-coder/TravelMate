import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router = Router();
router.use(requireAuth);

const eventSchema = z.object({
  event_type: z.enum(["profile_view"]),
  candidate_id: z.string().uuid(),
  source_trip_id: z.string().uuid().optional(),
  candidate_trip_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

router.post("/events", async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid matching event." });

  if (parsed.data.candidate_id === req.user.id) {
    return res.status(400).json({ error: "A matching event cannot target your own profile." });
  }

  const db = createUserClient(req.accessToken);
  const { data, error } = await db
    .from("matching_events")
    .insert({
      actor_id: req.user.id,
      candidate_id: parsed.data.candidate_id,
      source_trip_id: parsed.data.source_trip_id || null,
      candidate_trip_id: parsed.data.candidate_trip_id || null,
      event_type: parsed.data.event_type,
      metadata: parsed.data.metadata || {},
    })
    .select("id,event_type,created_at")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ event: data });
});

export default router;
