-- Phase 4: trips, match requests, accepted connections, messaging and notifications

create table if not exists public.match_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_requests_status_check check (status in ('pending','accepted','declined','cancelled')),
  constraint match_requests_sender_receiver_check check (sender_id <> receiver_id),
  constraint match_requests_unique_pending unique (trip_id, sender_id)
);

create index if not exists match_requests_receiver_idx on public.match_requests(receiver_id, status);
create index if not exists match_requests_sender_idx on public.match_requests(sender_id, status);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.match_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_check check (char_length(trim(body)) between 1 and 4000)
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

create or replace function public.touch_match_request()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists match_requests_updated_at on public.match_requests;
create trigger match_requests_updated_at before update on public.match_requests
for each row execute procedure public.touch_match_request();

alter table public.match_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_discover_authenticated" on public.profiles;
create policy "profiles_discover_authenticated" on public.profiles
for select to authenticated
using (is_discoverable = true or (select auth.uid()) = id);

drop policy if exists "trips_discover_authenticated" on public.trips;
create policy "trips_discover_authenticated" on public.trips
for select to authenticated
using (status = 'open' or (select auth.uid()) = user_id);

create policy "requests_participant_select" on public.match_requests
for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "requests_sender_insert" on public.match_requests
for insert to authenticated
with check ((select auth.uid()) = sender_id and sender_id <> receiver_id);

create policy "requests_participant_update" on public.match_requests
for update to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id)
with check ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

create policy "conversations_participant_select" on public.conversations
for select to authenticated
using (
  exists (
    select 1 from public.match_requests r
    where r.id = request_id
      and ((select auth.uid()) = r.sender_id or (select auth.uid()) = r.receiver_id)
      and r.status = 'accepted'
  )
);

create policy "conversations_participant_insert" on public.conversations
for insert to authenticated
with check (
  exists (
    select 1 from public.match_requests r
    where r.id = request_id
      and ((select auth.uid()) = r.sender_id or (select auth.uid()) = r.receiver_id)
      and r.status = 'accepted'
  )
);

create policy "messages_participant_select" on public.messages
for select to authenticated
using (
  exists (
    select 1
    from public.conversations c
    join public.match_requests r on r.id = c.request_id
    where c.id = conversation_id
      and r.status = 'accepted'
      and ((select auth.uid()) = r.sender_id or (select auth.uid()) = r.receiver_id)
  )
);

create policy "messages_participant_insert" on public.messages
for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and exists (
    select 1
    from public.conversations c
    join public.match_requests r on r.id = c.request_id
    where c.id = conversation_id
      and r.status = 'accepted'
      and ((select auth.uid()) = r.sender_id or (select auth.uid()) = r.receiver_id)
  )
);

create policy "notifications_own_select" on public.notifications
for select to authenticated using ((select auth.uid()) = user_id);

create policy "notifications_own_update" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.match_requests to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, update on public.notifications to authenticated;

-- Enable Supabase Realtime for messages.
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
