import { supabaseAdminSafe } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const { data, error } = await supabaseAdminSafe.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired access token." });
  }

  req.user = data.user;
  return next();
}
