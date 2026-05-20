-- SnapStudy quota enforcement + streak tracking
-- These functions are intended to be called from edge functions or triggers.

-- ============================================================
-- increment_captures(p_user_id)
-- - Resets monthly_captures when monthly_captures_resets_at has passed.
-- - Raises an exception if the user is on the 'free' plan and already at
--   10 captures in the current monthly window.
-- - Otherwise increments monthly_captures by 1.
-- ============================================================
create or replace function public.increment_captures(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_count integer;
  v_resets_at timestamptz;
  v_free_limit constant integer := 10;
begin
  select plan, monthly_captures, monthly_captures_resets_at
    into v_plan, v_count, v_resets_at
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id;
  end if;

  -- Reset window if past the reset timestamp
  if v_resets_at <= now() then
    v_count := 0;
    update public.users
       set monthly_captures = 0,
           monthly_captures_resets_at = date_trunc('month', now()) + interval '1 month'
     where id = p_user_id;
  end if;

  -- Enforce free-tier quota
  if v_plan = 'free' and v_count >= v_free_limit then
    raise exception 'Monthly capture limit reached for free plan (%).', v_free_limit
      using errcode = 'P0001';
  end if;

  update public.users
     set monthly_captures = monthly_captures + 1
   where id = p_user_id;
end;
$$;

-- ============================================================
-- update_streak(p_user_id)
-- - If last_review_date is today: no-op.
-- - If last_review_date is yesterday: streak_count += 1.
-- - If last_review_date is null or gap > 1 day: streak_count := 1.
-- - Sets last_review_date := today.
-- ============================================================
create or replace function public.update_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
  v_today date := current_date;
begin
  select last_review_date
    into v_last
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User % not found', p_user_id;
  end if;

  if v_last = v_today then
    -- already reviewed today; nothing to do
    return;
  elsif v_last = v_today - interval '1 day' then
    update public.users
       set streak_count = streak_count + 1,
           last_review_date = v_today
     where id = p_user_id;
  else
    -- null, or gap > 1 day -> reset
    update public.users
       set streak_count = 1,
           last_review_date = v_today
     where id = p_user_id;
  end if;
end;
$$;
