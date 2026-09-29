-- Phase 5: traveller travel posts and public trip exploration
create table if not exists public.travel_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  destination text,
  created_at timestamptz not null default now()
);

create index if not exists travel_posts_user_created_idx on public.travel_posts(user_id, created_at desc);

alter table public.travel_posts enable row level security;

drop policy if exists "travel_posts_public_select" on public.travel_posts;
create policy "travel_posts_public_select" on public.travel_posts
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = user_id and p.is_discoverable = true
  )
  or (select auth.uid()) = user_id
);

drop policy if exists "travel_posts_own_insert" on public.travel_posts;
create policy "travel_posts_own_insert" on public.travel_posts
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "travel_posts_own_update" on public.travel_posts;
create policy "travel_posts_own_update" on public.travel_posts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "travel_posts_own_delete" on public.travel_posts;
create policy "travel_posts_own_delete" on public.travel_posts
for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.travel_posts to authenticated;

insert into storage.buckets (id, name, public)
values ('travel-posts','travel-posts',true)
on conflict (id) do nothing;

drop policy if exists "travel_posts_storage_select" on storage.objects;
create policy "travel_posts_storage_select" on storage.objects
for select to public
using (bucket_id = 'travel-posts');

drop policy if exists "travel_posts_storage_insert" on storage.objects;
create policy "travel_posts_storage_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'travel-posts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "travel_posts_storage_update" on storage.objects;
create policy "travel_posts_storage_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'travel-posts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'travel-posts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "travel_posts_storage_delete" on storage.objects;
create policy "travel_posts_storage_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'travel-posts'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);