import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router=Router();
router.use(requireAuth);

const overlap=(a,b,c,d)=>new Date(a)<=new Date(d)&&new Date(c)<=new Date(b);
const intersection=(a,b)=>new Set((a||[]).map(x=>x.toLowerCase())).size ? (new Set((a||[]).map(x=>x.toLowerCase()))):new Set();

function scoreTrip(a,b){
  let destination=0,dates=0,budget=0,style=0,interests=0,activities=0;
  destination=a.destination.trim().toLowerCase()===b.destination.trim().toLowerCase()?30:0;
  dates=overlap(a.start_date,a.end_date,b.start_date,b.end_date)?25:0;
  if(a.budget_min!=null&&a.budget_max!=null&&b.budget_min!=null&&b.budget_max!=null){
    const lo=Math.max(a.budget_min,b.budget_min), hi=Math.min(a.budget_max,b.budget_max);
    budget=hi>=lo?15:0;
  } else budget=7;
  style=a.travel_style&&b.travel_style&&a.travel_style.toLowerCase()===b.travel_style.toLowerCase()?10:5;
  const ai=intersection(a.interests,b.interests), bi=intersection(a.activities,b.activities);
  const ia=new Set((a.interests||[]).map(x=>x.toLowerCase())).size;
  const ib=new Set((b.interests||[]).map(x=>x.toLowerCase())).size;
  const aa=new Set((a.activities||[]).map(x=>x.toLowerCase())).size;
  const ab=new Set((b.activities||[]).map(x=>x.toLowerCase())).size;
  interests=ia&&ib?Math.round((ai.size/Math.max(ia,ib))*10):5;
  activities=aa&&ab?Math.round((bi.size/Math.max(aa,ab))*10):5;
  return Math.min(100,destination+dates+budget+style+interests+activities);
}

router.get("/",async(req,res)=>{\n  if(!req.query.tripId) return res.status(400).json({error:"tripId is required to calculate compatibility."});
  const db=createUserClient(req.accessToken);
  const {data:trips,error}=await db.from("trips").select("*").eq("status","open").neq("user_id",req.user.id).order("created_at",{ascending:false});
  if(error)return res.status(400).json({error:error.message});
  const ids=[...new Set((trips||[]).map(t=>t.user_id))];
  let profiles=[];
  if(ids.length){const r=await db.from("profiles").select("id,display_name,avatar_url,bio,home_city,travel_style,interests,activities,is_discoverable").in("id",ids); if(r.error)return res.status(400).json({error:r.error.message}); profiles=r.data||[];}
  const map=new Map(profiles.map(p=>[p.id,p]));
  const items=(trips||[]).map(trip=>({trip,profile:map.get(trip.user_id)||null,compatibility:0})).filter(x=>x.profile?.is_discoverable!==false);
  if(req.query.tripId){
    const own=(await db.from("trips").select("*").eq("id",req.query.tripId).eq("user_id",req.user.id).single()).data;
    if(!own)return res.status(404).json({error:"Your trip was not found."});
    items.forEach(x=>x.compatibility=scoreTrip(own,x.trip));
  } else items.forEach(x=>x.compatibility=0);
  res.json({results:items});
});
export default router;
