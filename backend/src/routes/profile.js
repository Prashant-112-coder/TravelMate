import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router = Router();
const allowedFields = [
  "display_name", "avatar_url", "bio", "home_city", "travel_style",
  "budget_min", "budget_max", "currency", "interests", "activities",
  "preferred_destinations", "is_discoverable",
];

const cleanString = (value, max) => {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") throw new Error("Expected text value.");
  return value.trim().slice(0, max);
};

const cleanList = (value, maxItems = 20) => {
  if (value === null || value === undefined) return value;
  if (!Array.isArray(value)) throw new Error("Expected a list.");
  return [...new Set(value.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, maxItems))];
};

function validateProfile(input) {
  const output = {};
  if ("display_name" in input) output.display_name = cleanString(input.display_name, 80);
  if ("avatar_url" in input) output.avatar_url = cleanString(input.avatar_url, 1000) || null;
  if ("bio" in input) output.bio = cleanString(input.bio, 500);
  if ("home_city" in input) output.home_city = cleanString(input.home_city, 100);
  if ("travel_style" in input) output.travel_style = cleanString(input.travel_style, 60);
  if ("currency" in input) output.currency = cleanString(input.currency, 3).toUpperCase();
  if ("interests" in input) output.interests = cleanList(input.interests);
  if ("activities" in input) output.activities = cleanList(input.activities);
  if ("preferred_destinations" in input) output.preferred_destinations = cleanList(input.preferred_destinations);
  if ("is_discoverable" in input) {
    if (typeof input.is_discoverable !== "boolean") throw new Error("is_discoverable must be boolean.");
    output.is_discoverable = input.is_discoverable;
  }

  for (const field of ["budget_min", "budget_max"]) {
    if (!(field in input)) continue;
    if (input[field] === null || input[field] === "") {
      output[field] = null;
      continue;
    }
    const number = Number(input[field]);
    if (!Number.isFinite(number) || number < 0 || number > 100000000) throw new Error(`${field} must be a valid amount.`);
    output[field] = Math.round(number);
  }

  if (output.budget_min != null && output.budget_max != null && output.budget_min > output.budget_max) {
    throw new Error("Minimum budget cannot exceed maximum budget.");
  }
  return output;
}

router.get("/public/:id", requireAuth, async (req, res) => {
  const client = createUserClient(req.accessToken);
  const { data, error } = await client.from("profiles").select("id,display_name,avatar_url,bio,home_city,travel_style,interests,activities,preferred_destinations,is_discoverable").eq("id", req.params.id).eq("is_discoverable", true).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Traveller profile not found or is private." });
  return res.json({ profile: data });
});


router.get("/posts", requireAuth, async (req, res) => {
  const client = createUserClient(req.accessToken);
  const { data, error } = await client.from("travel_posts").select("*").eq("user_id", req.user.id).order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ posts: data || [] });
});

router.post("/posts", requireAuth, async (req, res) => {
  const image_url = typeof req.body?.image_url === "string" ? req.body.image_url.trim() : "";
  const caption = typeof req.body?.caption === "string" ? req.body.caption.trim().slice(0, 500) : null;
  const destination = typeof req.body?.destination === "string" ? req.body.destination.trim().slice(0, 120) : null;
  if (!image_url) return res.status(400).json({ error: "Travel post image is required." });
  const client = createUserClient(req.accessToken);
  const { data, error } = await client.from("travel_posts").insert({ user_id: req.user.id, image_url, caption, destination }).select("*").single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ post: data });
});

router.delete("/posts/:id", requireAuth, async (req, res) => {
  const client = createUserClient(req.accessToken);
  const { data, error } = await client.from("travel_posts").delete().eq("id", req.params.id).eq("user_id", req.user.id).select("id").single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true, id: data.id });
});

router.get("/", requireAuth, async (req, res) => {
  const client = createUserClient(req.accessToken);
  const { data, error } = await client.from("profiles").select("*").eq("id", req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  if (!data) {
    const displayName = req.user.user_metadata?.display_name || req.user.user_metadata?.full_name || req.user.email?.split("@")[0] || "Traveller";
    const { data: created, error: createError } = await client.from("profiles").insert({ id: req.user.id, display_name: displayName }).select("*").single();
    if (createError) return res.status(500).json({ error: createError.message });
    return res.json({ profile: created });
  }
  return res.json({ profile: data });
});

router.patch("/", requireAuth, async (req, res) => {
  try {
    const unknown = Object.keys(req.body || {}).filter((key) => !allowedFields.includes(key));
    if (unknown.length) return res.status(400).json({ error: `Unsupported profile field: ${unknown[0]}` });

    const updates = validateProfile(req.body || {});
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No profile changes supplied." });

    const client = createUserClient(req.accessToken);
    const { data, error } = await client.from("profiles").update(updates).eq("id", req.user.id).select("*").single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ profile: data });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid profile data." });
  }
});

export default router;
