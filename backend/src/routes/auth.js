import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email ?? null,
      createdAt: req.user.created_at,
    },
  });
});

export default router;
