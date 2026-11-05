-- Avoid recursive RLS evaluation when checking journey membership.
create or replace function public.is_journey_member(p_journey_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.journey_members where journey_id=p_journey_id and user_id=auth.uid());
$$;
revoke all on function public.is_journey_member(uuid) from public;
grant execute on function public.is_journey_member(uuid) to authenticated;
drop policy if exists journey_member_read on public.journeys;
create policy journey_member_read on public.journeys for select to authenticated using (public.is_journey_member(id));
drop policy if exists journey_member_read_members on public.journey_members;
create policy journey_member_read_members on public.journey_members for select to authenticated using (public.is_journey_member(journey_id));
drop policy if exists journey_member_itinerary_read on public.journey_itineraries;
create policy journey_member_itinerary_read on public.journey_itineraries for select to authenticated using (public.is_journey_member(journey_id));
drop policy if exists journey_member_itinerary_write on public.journey_itineraries;
create policy journey_member_itinerary_write on public.journey_itineraries for all to authenticated using (public.is_journey_member(journey_id)) with check (public.is_journey_member(journey_id));
drop policy if exists journey_member_days_read on public.itinerary_days;
create policy journey_member_days_read on public.itinerary_days for select to authenticated using (exists(select 1 from public.journey_itineraries i where i.id=itinerary_id and public.is_journey_member(i.journey_id)));
drop policy if exists journey_member_days_write on public.itinerary_days;
create policy journey_member_days_write on public.itinerary_days for all to authenticated using (exists(select 1 from public.journey_itineraries i where i.id=itinerary_id and public.is_journey_member(i.journey_id))) with check (exists(select 1 from public.journey_itineraries i where i.id=itinerary_id and public.is_journey_member(i.journey_id)));
drop policy if exists journey_member_activities_read on public.itinerary_activities;
create policy journey_member_activities_read on public.itinerary_activities for select to authenticated using (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id where d.id=day_id and public.is_journey_member(i.journey_id)));
drop policy if exists journey_member_activities_write on public.itinerary_activities;
create policy journey_member_activities_write on public.itinerary_activities for all to authenticated using (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id where d.id=day_id and public.is_journey_member(i.journey_id))) with check (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id where d.id=day_id and public.is_journey_member(i.journey_id)));
