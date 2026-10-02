-- Phase 1: create connection notifications safely inside Postgres.
-- The trigger runs with a tightly scoped SECURITY DEFINER function so one
-- authenticated user cannot directly insert notifications for another user.

create schema if not exists private;

create or replace function private.create_match_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.receiver_id,
      'match_request',
      'New match request',
      'A traveller sent you a request for your trip.',
      jsonb_build_object(
        'request_id', new.id,
        'trip_id', new.trip_id,
        'source_trip_id', new.source_trip_id
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'accepted' then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        new.sender_id,
        'match_accepted',
        'Request accepted',
        'Your travel connection request was accepted.',
        jsonb_build_object('request_id', new.id)
      );
    elsif new.status = 'declined' then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        new.sender_id,
        'match_declined',
        'Request declined',
        'Your travel connection request was declined.',
        jsonb_build_object('request_id', new.id)
      );
    elsif new.status = 'cancelled' then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        new.receiver_id,
        'match_cancelled',
        'Request cancelled',
        'A traveller cancelled their connection request.',
        jsonb_build_object('request_id', new.id)
      );
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function private.create_match_request_notification() from public;
revoke execute on function private.create_match_request_notification() from anon;
revoke execute on function private.create_match_request_notification() from authenticated;

drop trigger if exists match_request_notification_trigger on public.match_requests;
create trigger match_request_notification_trigger
after insert or update of status on public.match_requests
for each row
execute function private.create_match_request_notification();
