create extension if not exists pgcrypto;

create table if not exists public.board_note_likes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.board_notes(id) on delete cascade,
  client_id text not null check (char_length(btrim(client_id)) between 1 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  unique (note_id, client_id)
);

create index if not exists board_note_likes_note_id_idx
  on public.board_note_likes (note_id);

alter table public.board_note_likes enable row level security;

drop policy if exists "board_note_likes_select_all" on public.board_note_likes;
create policy "board_note_likes_select_all"
  on public.board_note_likes
  for select
  using (true);

drop policy if exists "board_note_likes_insert_all" on public.board_note_likes;
create policy "board_note_likes_insert_all"
  on public.board_note_likes
  for insert
  with check (true);

drop policy if exists "board_note_likes_delete_all" on public.board_note_likes;
create policy "board_note_likes_delete_all"
  on public.board_note_likes
  for delete
  using (true);
