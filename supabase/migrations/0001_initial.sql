-- SnapStudy initial schema
-- Postgres + pgvector + row-level security

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'student')),
  -- 19-weight FSRS parameter array, JSON for portability
  fsrs_params jsonb,
  streak_count integer not null default 0,
  last_review_date date,
  monthly_captures integer not null default 0,
  monthly_captures_resets_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DECKS
-- ============================================================
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  color text not null default '#7C5CFF',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_user_id_idx on public.decks(user_id);

-- ============================================================
-- CAPTURES
-- ============================================================
create type capture_status as enum ('pending', 'extracting', 'generating', 'ready', 'failed');

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  image_url text,
  raw_text text,
  status capture_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index captures_user_id_idx on public.captures(user_id);
create index captures_deck_id_idx on public.captures(deck_id);
create index captures_status_idx on public.captures(status);

-- ============================================================
-- SUMMARIES
-- ============================================================
create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  content text not null,
  view_mode text not null default 'bullets' check (view_mode in ('bullets', 'paragraph')),
  created_at timestamptz not null default now()
);

create index summaries_capture_id_idx on public.summaries(capture_id);

-- ============================================================
-- CARDS (flashcards)
-- ============================================================
create type card_type as enum ('basic', 'cloze', 'definition');

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  capture_id uuid references public.captures(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  front text not null,
  back text not null,
  type card_type not null default 'basic',
  -- FSRS state
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  reps integer not null default 0,
  lapses integer not null default 0,
  state text not null default 'new' check (state in ('new', 'learning', 'review', 'relearning')),
  suspended boolean not null default false,
  starred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_deck_id_idx on public.cards(deck_id);
create index cards_user_id_idx on public.cards(user_id);
create index cards_due_at_idx on public.cards(due_at) where suspended = false;

-- ============================================================
-- REVIEWS (history of FSRS ratings)
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 4), -- 1=Again, 2=Hard, 3=Good, 4=Easy
  elapsed_days double precision not null,
  stability_before double precision not null,
  difficulty_before double precision not null,
  stability_after double precision not null,
  difficulty_after double precision not null,
  reviewed_at timestamptz not null default now()
);

create index reviews_card_id_idx on public.reviews(card_id);
create index reviews_user_id_idx on public.reviews(user_id);

-- ============================================================
-- QUIZZES
-- ============================================================
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- questions stored as JSON array:
  -- [{ id, type: 'mcq'|'short', prompt, options?, answer, explanation }]
  questions jsonb not null,
  created_at timestamptz not null default now()
);

create index quizzes_capture_id_idx on public.quizzes(capture_id);
create index quizzes_user_id_idx on public.quizzes(user_id);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  score double precision not null,
  answers jsonb not null,
  attempted_at timestamptz not null default now()
);

create index quiz_attempts_user_id_idx on public.quiz_attempts(user_id);

-- ============================================================
-- EMBEDDINGS (semantic search)
-- ============================================================
create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  owner_table text not null,
  owner_id uuid not null,
  content text not null,
  content_hash text not null,
  embedding vector(768),
  created_at timestamptz not null default now(),
  unique (owner_table, owner_id)
);

create index embeddings_owner_idx on public.embeddings(owner_table, owner_id);
create index embeddings_user_id_idx on public.embeddings(user_id);
create index embeddings_vector_idx on public.embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- SUBSCRIPTIONS (mirrors RevenueCat state)
-- ============================================================
create table public.subscriptions (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null check (status in ('active', 'expired', 'in_grace_period', 'cancelled', 'none')),
  tier text not null default 'free' check (tier in ('free', 'pro', 'student')),
  renews_at timestamptz,
  revenuecat_id text,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.decks enable row level security;
alter table public.captures enable row level security;
alter table public.summaries enable row level security;
alter table public.cards enable row level security;
alter table public.reviews enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.embeddings enable row level security;
alter table public.subscriptions enable row level security;

-- Users: read/update only own profile
create policy "users_own_row_select" on public.users
  for select using (auth.uid() = id);
create policy "users_own_row_update" on public.users
  for update using (auth.uid() = id);

-- Decks: full CRUD on own rows
create policy "decks_own_rows" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Captures
create policy "captures_own_rows" on public.captures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Summaries: read via capture ownership; service role writes
create policy "summaries_via_capture" on public.summaries
  for select using (
    exists (select 1 from public.captures c
            where c.id = capture_id and c.user_id = auth.uid())
  );

-- Cards
create policy "cards_own_rows" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reviews
create policy "reviews_own_rows" on public.reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Quizzes
create policy "quizzes_own_rows" on public.quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_attempts_own_rows" on public.quiz_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Embeddings
create policy "embeddings_own_rows" on public.embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Subscriptions: read only by user; writes go through service role
create policy "subscriptions_own_row_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create user row on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  insert into public.subscriptions (user_id, status, tier)
  values (new.id, 'none', 'free');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at touch
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();
create trigger decks_touch before update on public.decks
  for each row execute function public.touch_updated_at();
create trigger captures_touch before update on public.captures
  for each row execute function public.touch_updated_at();
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- ============================================================
-- STORAGE BUCKET (run separately via dashboard or CLI)
-- ============================================================
-- supabase storage create captures --public false
-- Then apply policy: only authenticated users can read/write within their own folder.
