import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};

export const supabaseAdminSafe = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  clientOptions,
);

export function createUserClient(accessToken) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
