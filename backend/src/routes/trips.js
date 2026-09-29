import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router = Router();
const tripSchema = z.object({
  title: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  start_date: z.string(),
  end_date: z.string(),
  budget_min: z.coerce.number().int().min(0).nullable().optional(),
  budget_max: z.coerce.number().int().min(0).nullable().optional(),
  currency: z.string().trim().length(3).default("INR"),
  travel_style: z.string().trim().max(50).nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(50)).default([]),
  activities: z.array(z.string().trim().min(1).max(50)).default([]),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["draft","open","matched","completed","cancelled"]).default("open"),
}).superRefine((v, ctx) => {
  if (v.end_date < v.start_date) ctx.addIssue({code:"custom",path:["end_date"],message:"End date must be on or after start date."});
  if (v.budget_min != null && v.budget_max != null && v.budget_max < v.budget_min) ctx.addIssue({code:"custom",path:["budget_max"],message:"Maximum budget must be greater than or equal to minimum budget."});
});

router.use(requireAuth);

router.get("/", async (req,res) => {
  const db=createUserClient(req.accessToken);
  const {data,error}=await db.from("trips").select("*").eq("user_id",req.user.id).order("start_date",{ascending:true});
  if(error) return res.status(400).json({error:error.message});
  res.json({trips:data||[]});
});

router.get("/:id", async (req,res) => {
  const db=createUserClient(req.accessToken);
  const {data,error}=await db.from("trips").select("*").eq("id",req.params.id).single();
  if(error) return res.status(404).json({error:"Trip not found."});
  res.json({trip:data});
});

router.post("/", async (req,res) => {
  const parsed=tripSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:parsed.error.issues[0]?.message||"Invalid trip."});
  const db=createUserClient(req.accessToken);
  const {data,error}=await db.from("trips").insert({...parsed.data,user_id:req.user.id}).select("*").single();
  if(error) return res.status(400).json({error:error.message});
  res.status(201).json({trip:data});
});

router.patch("/:id", async (req,res) => {
  const parsed=tripSchema.partial().safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:parsed.error.issues[0]?.message||"Invalid trip."});
  const db=createUserClient(req.accessToken);
  const {data,error}=await db.from("trips").update(parsed.data).eq("id",req.params.id).eq("user_id",req.user.id).select("*").single();
  if(error) return res.status(400).json({error:error.message});
  res.json({trip:data});
});

router.delete("/:id", async (req,res) => {
  const db=createUserClient(req.accessToken);
  const {error}=await db.from("trips").delete().eq("id",req.params.id).eq("user_id",req.user.id);
  if(error) return res.status(400).json({error:error.message});
  res.json({ok:true});
});

export default router;
