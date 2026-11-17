import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { generateItinerary, listItineraryDestinations } from "../services/itineraryEngine.js";

const router = Router();
router.use(requireAuth);

const generateSchema = z.object({
  destination: z.string().trim().min(2).max(120),
  travel_date: z.string().date("Travel date must be a valid YYYY-MM-DD date."),
  days: z.coerce.number().int().min(1).max(10),
  travelers: z.coerce.number().int().min(1).max(20).default(1),
  total_budget: z.coerce.number().positive().max(10000000),
  interests: z.array(z.string().trim().min(1).max(50)).max(12).default([]),
});

router.get("/destinations", (_req, res) => {
  res.json({ destinations: listItineraryDestinations() });
});

router.post("/generate", (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid itinerary request." });
  }

  try {
    const itinerary = generateItinerary(parsed.data);
    return res.json({ itinerary });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || "Unable to generate itinerary.",
      suggestions: error.suggestions || [],
    });
  }
});

export default router;
