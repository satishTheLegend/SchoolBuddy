-- Account deletion RPC
-- Allows an authenticated user to permanently delete their own auth.users row.
-- All public.* rows are removed automatically via the existing
-- `on delete cascade` foreign keys to auth.users(id) / public.users(id).

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Removing the auth.users row cascades through public.users and every
  -- downstream table (decks, captures, cards, reviews, quizzes,
  -- quiz_attempts, embeddings, subscriptions, summaries via capture).
  delete from auth.users where id = uid;
end;
$$;

-- Lock down execution: only logged-in users may call it, and the function
-- itself enforces that the caller can only delete themselves.
revoke all on function public.delete_user_account() from public;
grant execute on function public.delete_user_account() to authenticated;
