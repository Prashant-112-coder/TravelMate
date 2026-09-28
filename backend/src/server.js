import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const env = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).parse(process.env);

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "travel-mate-api",
    project: "Travel Mate – A Smart Traveller Matching Platform for Solo Travellers",
  });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(env.PORT, () => {
  console.log(`Travel Mate API listening on port ${env.PORT}`);
});
