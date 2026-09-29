import { apiFetch } from "./api";

export async function getProfile() {
  const result = await apiFetch("/profile");
  return result.profile;
}

export async function updateProfile(changes) {
  const result = await apiFetch("/profile", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  return result.profile;
}

export async function uploadProfilePhoto(file, userId) {
  const { supabase } = await import("./supabase");
  if (!supabase) throw new Error("Supabase is not configured.");

  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile photo must be 5 MB or smaller.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data.publicUrl;
}


export async function uploadProfileImage(file, userId, folder = "profile") {
  const { supabase } = await import("./supabase");
  if (!supabase) throw new Error("Supabase is not configured.");

  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const maxSize = folder === "background" ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(folder === "background" ? "Background image must be 8 MB or smaller." : "Profile photo must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (uploadError) throw new Error(uploadError.message);
  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data.publicUrl;
}
