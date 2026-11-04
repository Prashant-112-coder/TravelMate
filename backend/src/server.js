import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import tripsRouter from "./routes/trips.js";
import discoverRouter from "./routes/discover.js";
import requestsRouter from "./routes/requests.js";
import messagesRouter from "./routes/messages.js";
import notificationsRouter from "./routes/notifications.js";
import exploreRouter from "./routes/explore.js";
import matchingRouter from "./routes/matching.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
const allowedOrigins = new Set([
  env.CLIENT_ORIGIN,
  ...(env.NODE_ENV === "development"
    ? ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
    : []),
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "travel-mate-api", project: "Travel Mate – A Smart Traveller Matching Platform for Solo Travellers" });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/discover", discoverRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/explore", exploreRouter);
app.use("/api/matching", matchingRouter);
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.listen(env.PORT, () => console.log(`Travel Mate API listening on port ${env.PORT}`));
