-- Tags: many-to-many between tags and cards/captures.
-- A tag belongs to one user; it can be applied to any of that user's
-- cards or captures.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text not null default '#7C5CFF',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index tags_user_id_idx on public.tags(user_id);

create table public.card_tags (
  card_id uuid not null references public.cards(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (card_id, tag_id)
);

create index card_tags_tag_idx on public.card_tags(tag_id);
create index card_tags_user_idx on public.card_tags(user_id);

create table public.capture_tags (
  capture_id uuid not null references public.captures(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (capture_id, tag_id)
);

create index capture_tags_tag_idx on public.capture_tags(tag_id);
create index capture_tags_user_idx on public.capture_tags(user_id);

alter table public.tags enable row level security;
alter table public.card_tags enable row level security;
alter table public.capture_tags enable row level security;

create policy "tags_own_rows" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "card_tags_own_rows" on public.card_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "capture_tags_own_rows" on public.capture_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
