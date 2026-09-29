-- Phase 4 hardening: server-side notifications for request lifecycle
create or replace function public.handle_match_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id,type,title,body,data)
    values (
      new.receiver_id,
      'match_request',
      'New travel request',
      'Someone wants to travel with you.',
      jsonb_build_object('request_id',new.id)
    );
  elsif tg_op = 'UPDATE' and old.status <> 'accepted' and new.status = 'accepted' then
    insert into public.notifications(user_id,type,title,body,data)
    values (
      new.sender_id,
      'match_accepted',
      'Request accepted',
      'Your travel request was accepted. You can now message your travel mate.',
      jsonb_build_object('request_id',new.id)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists match_request_notification on public.match_requests;
create trigger match_request_notification
after insert or update of status on public.match_requests
for each row execute procedure public.handle_match_request_notification();
revoke execute on function public.handle_match_request_notification() from public;
revoke execute on function public.handle_match_request_notification() from anon;
revoke execute on function public.handle_match_request_notification() from authenticated;