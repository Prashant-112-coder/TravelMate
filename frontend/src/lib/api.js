import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, options, token) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function apiFetch(path, options = {}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  let { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData.session?.access_token;

  if (!token || (sessionData.session?.expires_at && sessionData.session.expires_at * 1000 <= Date.now() + 30000)) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw new Error("Your session has expired. Please sign in again.");
    token = refreshed.data.session?.access_token;
  }

  let response = await request(path, options, token);
  if (response.status === 401) {
    const refreshed = await supabase.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session?.access_token) {
      response = await request(path, options, refreshed.data.session.access_token);
    }
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}
