alter table public.profiles
  add column if not exists background_url text;

comment on column public.profiles.background_url is 'Optional profile cover/background image URL stored in Supabase Storage.';