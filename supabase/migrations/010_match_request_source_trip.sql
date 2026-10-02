-- Phase 1: preserve the source trip used when a traveller sends a match request.
-- This keeps accepted/declined outcomes connected to the exact matching features used.

alter table public.match_requests
  add column if not exists source_trip_id uuid references public.trips(id) on delete set null;

create index if not exists match_requests_source_trip_idx
  on public.match_requests(source_trip_id);
