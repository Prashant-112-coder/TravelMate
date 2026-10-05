-- Phase 6: one active connection per traveller pair
-- Prevents duplicate pending/accepted requests in either direction.
create unique index if not exists match_requests_active_pair_unique
on public.match_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status in ('pending', 'accepted');
