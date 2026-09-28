-- Travel Mate foundation core schema
-- Applied to Supabase project ljgpfhmhtbkfplwcnwwc

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  home_city text,
  travel_style text,
  budget_min integer,
  budget_max integer,
  currency text not null default 'INR',
  interests text[] not null default '{}',
  activities text[] not null default '{}',
  preferred_destinations text[] not null default '{}',
  is_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_budget_check check (
    budget_min is null or budget_max is null or
    (budget_min >= 0 and budget_max >= budget_min)
  )
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget_min integer,
  budget_max integer,
  currency text not null default 'INR',
  travel_style text,
  interests text[] not null default '{}',
  activities text[] not null default '{}',
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_check check (end_date >= start_date),
  constraint trips_budget_check check (
    budget_min is null or budget_max is null or
    (budget_min >= 0 and budget_max >= budget_min)
  ),
  constraint trips_status_check check (status in ('draft','open','matched','completed','cancelled'))
);

create index trips_user_id_idx on public.trips(user_id);
create index trips_destination_idx on public.trips(destination);
create index trips_dates_idx on public.trips(start_date, end_date);
create index trips_status_idx on public.trips(status);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;

create policy "profiles_select_self" on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_self" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_self" on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles_delete_self" on public.profiles for delete to authenticated
using ((select auth.uid()) = id);

create policy "trips_select_own" on public.trips for select to authenticated
using ((select auth.uid()) = user_id);

create policy "trips_insert_own" on public.trips for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "trips_update_own" on public.trips for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "trips_delete_own" on public.trips for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
