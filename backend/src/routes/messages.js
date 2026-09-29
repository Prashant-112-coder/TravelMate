import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";

const router=Router(); router.use(requireAuth);
router.get("/conversations",async(req,res)=>{
 const db=createUserClient(req.accessToken);
 const {data,error}=await db.from("conversations").select("id,request_id,created_at,request:match_requests!inner(id,sender_id,receiver_id,status,trip:trips(id,title,destination))").order("created_at",{ascending:false});
 if(error)return res.status(400).json({error:error.message});
 const rows=(data||[]).filter(c=>c.request?.status==="accepted");
 const ids=[...new Set(rows.flatMap(c=>[c.request.sender_id,c.request.receiver_id]))];
 const pr=ids.length?await db.from("profiles").select("id,display_name,avatar_url").in("id",ids):{data:[]};
 const pm=new Map((pr.data||[]).map(p=>[p.id,p]));
 res.json({conversations:rows.map(c=>({...c,other:pm.get(c.request.sender_id===req.user.id?c.request.receiver_id:c.request.sender_id)||null}))});
});
router.get("/:id/messages",async(req,res)=>{
 const db=createUserClient(req.accessToken);
 const {data,error}=await db.from("messages").select("*").eq("conversation_id",req.params.id).order("created_at",{ascending:true});
 if(error)return res.status(400).json({error:error.message}); res.json({messages:data||[]});
});
router.post("/:id/messages",async(req,res)=>{
 const body=z.string().trim().min(1).max(4000).safeParse(req.body.body);
 if(!body.success)return res.status(400).json({error:"Message cannot be empty."});
 const db=createUserClient(req.accessToken);
 const {data,error}=await db.from("messages").insert({conversation_id:req.params.id,sender_id:req.user.id,body:body.data}).select("*").single();
 if(error)return res.status(400).json({error:error.message});
 res.status(201).json({message:data});
});
export default router;
