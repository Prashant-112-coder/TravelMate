import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router=Router(); router.use(requireAuth);
const createSchema=z.object({trip_id:z.string().uuid(),message:z.string().trim().max(1000).optional()});

router.get("/",async(req,res)=>{
 const db=createUserClient(req.accessToken);
 const {data,error}=await db.from("match_requests").select("*, trip:trips(id,title,destination,start_date,end_date,user_id)").or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`).order("created_at",{ascending:false});
 if(error)return res.status(400).json({error:error.message});
 const ids=[...new Set((data||[]).flatMap(r=>[r.sender_id,r.receiver_id]))];
 const pr=ids.length?await db.from("profiles").select("id,display_name,avatar_url,home_city").in("id",ids):{data:[]};
 const pm=new Map((pr.data||[]).map(p=>[p.id,p]));
 res.json({requests:(data||[]).map(r=>({...r,sender:pm.get(r.sender_id),receiver:pm.get(r.receiver_id)}))});
});

router.post("/",async(req,res)=>{
 const parsed=createSchema.safeParse(req.body); if(!parsed.success)return res.status(400).json({error:"Invalid request."});
 const db=createUserClient(req.accessToken);
 const {data:trip,error:te}=await db.from("trips").select("id,user_id,status").eq("id",parsed.data.trip_id).single();
 if(te||!trip||trip.status!=="open")return res.status(400).json({error:"That trip is no longer open."});
 if(trip.user_id===req.user.id)return res.status(400).json({error:"You cannot request your own trip."});
 const {data,error}=await db.from("match_requests").insert({trip_id:trip.id,sender_id:req.user.id,receiver_id:trip.user_id,message:parsed.data.message||null}).select("*").single();
 if(error)return res.status(400).json({error:error.code==="23505"?"You already sent a request for this trip.":error.message});

 res.status(201).json({request:data});
});

router.patch("/:id",async(req,res)=>{
 const status=z.enum(["accepted","declined","cancelled"]).safeParse(req.body.status);
 if(!status.success)return res.status(400).json({error:"Invalid status."});
 const db=createUserClient(req.accessToken);
 const {data:r,error:re}=await db.from("match_requests").select("*").eq("id",req.params.id).single();
 if(re||!r)return res.status(404).json({error:"Request not found."});
 if(status.data==="accepted"&&r.receiver_id!==req.user.id)return res.status(403).json({error:"Only the recipient can accept a request."});
 if(status.data==="declined"&&r.receiver_id!==req.user.id)return res.status(403).json({error:"Only the recipient can decline a request."});
 if(status.data==="cancelled"&&r.sender_id!==req.user.id)return res.status(403).json({error:"Only the sender can cancel a request."});
 const {data:updated,error}=await db.from("match_requests").update({status:status.data}).eq("id",r.id).select("*").single();
 if(error)return res.status(400).json({error:error.message});
 if(status.data==="accepted"){
   const {data:conv,error:ce}=await db.from("conversations").insert({request_id:r.id}).select("*").single();
   if(ce && ce.code!=="23505")return res.status(400).json({error:ce.message});

   return res.json({request:updated,conversation:conv||null});
 }
 res.json({request:updated});
});
export default router;
