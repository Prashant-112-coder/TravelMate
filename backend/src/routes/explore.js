import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router=Router();
router.use(requireAuth);

router.get("/trips",async(req,res)=>{
  const db=createUserClient(req.accessToken);
  const {data:trips,error}=await db.from("trips").select("*").eq("status","open").neq("user_id",req.user.id).order("created_at",{ascending:false});
  if(error)return res.status(400).json({error:error.message});
  const ids=[...new Set((trips||[]).map(t=>t.user_id))];
  if(!ids.length)return res.json({trips:[]});
  const {data:profiles,error:pe}=await db.from("profiles").select("id,display_name,avatar_url,bio,home_city,travel_style,interests,activities,is_discoverable").in("id",ids);
  if(pe)return res.status(400).json({error:pe.message});
  const map=new Map((profiles||[]).map(p=>[p.id,p]));
  res.json({trips:(trips||[]).map(trip=>({...trip,profile:map.get(trip.user_id)||null})).filter(t=>t.profile?.is_discoverable!==false)});
});

router.get("/profile/:id/posts",async(req,res)=>{
  const db=createUserClient(req.accessToken);
  const {data,error}=await db.from("travel_posts").select("*").eq("user_id",req.params.id).order("created_at",{ascending:false});
  if(error)return res.status(400).json({error:error.message});
  res.json({posts:data||[]});
});
export default router;
