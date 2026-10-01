-- Phase 7: matching baseline + ML-ready interaction dataset
-- The baseline engine is intentionally deterministic and explainable.
-- Future ML models can train from matching_events without changing the app contract.

create table if not exists public.matching_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid references public.profiles(id) on delete set null,
  source_trip_id uuid references public.trips(id) on delete set null,
  candidate_trip_id uuid references public.trips(id) on delete set null,
  event_type text not null,
  destination_similarity numeric(5,4),
  date_overlap numeric(5,4),
  budget_similarity numeric(5,4),
  style_similarity numeric(5,4),
  interests_similarity numeric(5,4),
  activities_similarity numeric(5,4),
  baseline_score numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint matching_events_type_check check (
    event_type in (
      'impression',
      'profile_view',
      'request_sent',
      'request_accepted',
      'request_declined',
      'request_cancelled'
    )
  ),
  constraint matching_events_similarity_check check (
    destination_similarity is null or destination_similarity between 0 and 1
  ),
  constraint matching_events_date_similarity_check check (
    date_overlap is null or date_overlap between 0 and 1
  ),
  constraint matching_events_budget_similarity_check check (
    budget_similarity is null or budget_similarity between 0 and 1
  ),
  constraint matching_events_style_similarity_check check (
    style_similarity is null or style_similarity between 0 and 1
  ),
  constraint matching_events_interest_similarity_check check (
    interests_similarity is null or interests_similarity between 0 and 1
  ),
  constraint matching_events_activity_similarity_check check (
    activities_similarity is null or activities_similarity between 0 and 1
  ),
  constraint matching_events_score_check check (
    baseline_score is null or baseline_score between 0 and 100
  )
);

create index if not exists matching_events_actor_created_idx
  on public.matching_events(actor_id, created_at desc);

create index if not exists matching_events_candidate_idx
  on public.matching_events(candidate_id, created_at desc);

create index if not exists matching_events_type_idx
  on public.matching_events(event_type, created_at desc);

alter table public.matching_events enable row level security;

drop policy if exists "matching_events_actor_insert" on public.matching_events;
create policy "matching_events_actor_insert"
on public.matching_events
for insert to authenticated
with check ((select auth.uid()) = actor_id);

drop policy if exists "matching_events_actor_select" on public.matching_events;
create policy "matching_events_actor_select"
on public.matching_events
for select to authenticated
using ((select auth.uid()) = actor_id);

grant select, insert on public.matching_events to authenticated;
