import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

export const supabaseAdminSafe = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
