create extension if not exists pgcrypto;

create table if not exists public.board_note_comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.board_notes(id) on delete cascade,
  author text not null default '익명' check (char_length(btrim(author)) between 1 and 40),
  content text not null check (char_length(btrim(content)) between 1 and 240),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists board_note_comments_note_id_created_at_idx
  on public.board_note_comments (note_id, created_at asc);

alter table public.board_note_comments enable row level security;

drop policy if exists "board_note_comments_select_all" on public.board_note_comments;
create policy "board_note_comments_select_all"
  on public.board_note_comments
  for select
  using (true);

drop policy if exists "board_note_comments_insert_all" on public.board_note_comments;
create policy "board_note_comments_insert_all"
  on public.board_note_comments
  for insert
  with check (true);
