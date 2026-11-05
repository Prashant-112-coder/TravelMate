-- Shared journeys created only after a match request is accepted.
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.match_requests(id) on delete restrict,
  trip_id uuid not null references public.trips(id) on delete restrict,
  title text not null,
  destination text not null,
  start_date date,
  end_date date,
  budget_min numeric,
  budget_max numeric,
  currency text not null default 'INR',
  travel_style text,
  status text not null default 'planning' check (status in ('planning','confirmed','ongoing','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.journey_members (
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'traveller' check (role in ('organizer','traveller')),
  joined_at timestamptz not null default now(),
  primary key (journey_id,user_id)
);
create table if not exists public.journey_itineraries (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null unique references public.journeys(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','approved')),
  version integer not null default 1,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.journey_itineraries(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  day_date date,
  title text,
  unique(itinerary_id,day_number)
);
create table if not exists public.itinerary_activities (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.itinerary_days(id) on delete cascade,
  period text not null check (period in ('morning','afternoon','evening')),
  title text not null,
  description text,
  start_time time,
  end_time time,
  source text not null default 'manual' check (source in ('manual','dataset','google_places')),
  place_name text,
  place_address text,
  place_url text,
  sort_order integer not null default 0
);
create index if not exists journey_members_user_idx on public.journey_members(user_id);
create index if not exists journey_days_itinerary_idx on public.itinerary_days(itinerary_id,day_number);
alter table public.journeys enable row level security;
alter table public.journey_members enable row level security;
alter table public.journey_itineraries enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_activities enable row level security;
create policy journey_member_read on public.journeys for select to authenticated
using (exists(select 1 from public.journey_members jm where jm.journey_id=id and jm.user_id=(select auth.uid())));
create policy journey_member_read_members on public.journey_members for select to authenticated
using (exists(select 1 from public.journey_members jm where jm.journey_id=journey_id and jm.user_id=(select auth.uid())));
create policy journey_member_itinerary_read on public.journey_itineraries for select to authenticated
using (exists(select 1 from public.journey_members jm where jm.journey_id=journey_id and jm.user_id=(select auth.uid())));
create policy journey_member_itinerary_write on public.journey_itineraries for all to authenticated
using (exists(select 1 from public.journey_members jm where jm.journey_id=journey_id and jm.user_id=(select auth.uid())))
with check (exists(select 1 from public.journey_members jm where jm.journey_id=journey_id and jm.user_id=(select auth.uid())));
create policy journey_member_days_read on public.itinerary_days for select to authenticated
using (exists(select 1 from public.journey_itineraries i join public.journey_members jm on jm.journey_id=i.journey_id where i.id=itinerary_id and jm.user_id=(select auth.uid())));
create policy journey_member_days_write on public.itinerary_days for all to authenticated
using (exists(select 1 from public.journey_itineraries i join public.journey_members jm on jm.journey_id=i.journey_id where i.id=itinerary_id and jm.user_id=(select auth.uid())))
with check (exists(select 1 from public.journey_itineraries i join public.journey_members jm on jm.journey_id=i.journey_id where i.id=itinerary_id and jm.user_id=(select auth.uid())));
create policy journey_member_activities_read on public.itinerary_activities for select to authenticated
using (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id join public.journey_members jm on jm.journey_id=i.journey_id where d.id=day_id and jm.user_id=(select auth.uid())));
create policy journey_member_activities_write on public.itinerary_activities for all to authenticated
using (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id join public.journey_members jm on jm.journey_id=i.journey_id where d.id=day_id and jm.user_id=(select auth.uid())))
with check (exists(select 1 from public.itinerary_days d join public.journey_itineraries i on i.id=d.itinerary_id join public.journey_members jm on jm.journey_id=i.journey_id where d.id=day_id and jm.user_id=(select auth.uid())));
grant select on public.journeys,public.journey_members,public.journey_itineraries,public.itinerary_days,public.itinerary_activities to authenticated;
grant insert,update,delete on public.journey_itineraries,public.itinerary_days,public.itinerary_activities to authenticated;

create or replace function public.create_journey_for_accepted_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.match_requests%rowtype; t public.trips%rowtype; j_id uuid;
begin
  select * into r from public.match_requests where id=p_request_id for update;
  if not found or r.status <> 'accepted' then raise exception 'Request must be accepted before a journey can be created'; end if;
  if auth.uid() not in (r.sender_id,r.receiver_id) then raise exception 'Not a participant in this request'; end if;
  select * into t from public.trips where id=r.trip_id;
  if not found then raise exception 'Trip not found'; end if;
  insert into public.journeys(request_id,trip_id,title,destination,start_date,end_date,budget_min,budget_max,currency,travel_style)
  values(r.id,t.id,coalesce(nullif(t.title,''),t.destination||' journey'),t.destination,t.start_date,t.end_date,t.budget_min,t.budget_max,coalesce(t.currency,'INR'),t.travel_style)
  on conflict(request_id) do update set request_id=excluded.request_id
  returning id into j_id;
  insert into public.journey_members(journey_id,user_id,role)
  values(j_id,r.sender_id,'organizer'),(j_id,r.receiver_id,'traveller')
  on conflict(journey_id,user_id) do nothing;
  return j_id;
end; $$;
revoke all on function public.create_journey_for_accepted_request(uuid) from public;
grant execute on function public.create_journey_for_accepted_request(uuid) to authenticated;
