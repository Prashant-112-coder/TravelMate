import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const localEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(localEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(localEnvPath);
}

export const env = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MATCHING_ENGINE: z.enum(["baseline", "ml"]).default("baseline"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
}).parse(process.env);
