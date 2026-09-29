import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../config/supabase.js";
const router=Router(); router.use(requireAuth);
router.get("/",async(req,res)=>{const db=createUserClient(req.accessToken);const {data,error}=await db.from("notifications").select("*").eq("user_id",req.user.id).order("created_at",{ascending:false});if(error)return res.status(400).json({error:error.message});res.json({notifications:data||[]});});
router.patch("/:id/read",async(req,res)=>{const db=createUserClient(req.accessToken);const {data,error}=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",req.params.id).eq("user_id",req.user.id).select("*").single();if(error)return res.status(400).json({error:error.message});res.json({notification:data});});
export default router;
