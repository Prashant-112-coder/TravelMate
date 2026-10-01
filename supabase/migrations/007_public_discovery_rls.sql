-- Phase 6: allow authenticated users to discover only open trips
-- belonging to discoverable travellers, while keeping writes owner-only.

drop policy if exists "profiles_select_discoverable" on public.profiles;
create policy "profiles_select_discoverable"
on public.profiles
for select
to authenticated
using (is_discoverable = true or (select auth.uid()) = id);

drop policy if exists "trips_select_open_discoverable" on public.trips;
create policy "trips_select_open_discoverable"
on public.trips
for select
to authenticated
using (
  status = 'open'
  and exists (
    select 1
    from public.profiles p
    where p.id = trips.user_id
      and p.is_discoverable = true
  )
);

drop policy if exists "travel_posts_select_discoverable" on public.travel_posts;
create policy "travel_posts_select_discoverable"
on public.travel_posts
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = travel_posts.user_id
      and p.is_discoverable = true
  )
);
