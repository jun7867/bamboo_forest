create extension if not exists pgcrypto;

create table if not exists public.board_notes (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category = any (array['praise', 'suggestion', 'freeTalk', 'question'])),
  content text not null check (char_length(btrim(content)) between 1 and 120),
  color text not null check (color = any (array['butter', 'sky', 'mint', 'lavender', 'blush', 'peach'])),
  password text not null check (char_length(btrim(password)) between 1 and 64),
  position_x double precision not null default 22,
  position_y double precision not null default 26,
  rotation double precision not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_board_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists board_notes_set_updated_at on public.board_notes;

create trigger board_notes_set_updated_at
before update on public.board_notes
for each row
execute function public.set_board_notes_updated_at();

alter table public.board_notes enable row level security;

create or replace function public.list_board_notes()
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    board_notes.id,
    board_notes.category,
    board_notes.content,
    board_notes.color,
    board_notes.position_x,
    board_notes.position_y,
    board_notes.rotation,
    board_notes.created_at,
    board_notes.updated_at
  from public.board_notes
  order by board_notes.created_at asc;
$$;

create or replace function public.create_board_note(
  p_category text,
  p_content text,
  p_color text,
  p_password text,
  p_position_x double precision,
  p_position_y double precision,
  p_rotation double precision
)
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_note public.board_notes%rowtype;
begin
  insert into public.board_notes (
    category,
    content,
    color,
    password,
    position_x,
    position_y,
    rotation
  )
  values (
    p_category,
    btrim(p_content),
    p_color,
    btrim(p_password),
    p_position_x,
    p_position_y,
    p_rotation
  )
  returning *
  into inserted_note;

  return query
  select
    inserted_note.id,
    inserted_note.category,
    inserted_note.content,
    inserted_note.color,
    inserted_note.position_x,
    inserted_note.position_y,
    inserted_note.rotation,
    inserted_note.created_at,
    inserted_note.updated_at;
end;
$$;

create or replace function public.move_board_note(
  p_note_id uuid,
  p_position_x double precision,
  p_position_y double precision
)
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  moved_note public.board_notes%rowtype;
begin
  update public.board_notes
  set
    position_x = p_position_x,
    position_y = p_position_y
  where board_notes.id = p_note_id
  returning *
  into moved_note;

  if moved_note.id is null then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  return query
  select
    moved_note.id,
    moved_note.category,
    moved_note.content,
    moved_note.color,
    moved_note.position_x,
    moved_note.position_y,
    moved_note.rotation,
    moved_note.created_at,
    moved_note.updated_at;
end;
$$;

create or replace function public.update_board_note_with_password(
  p_note_id uuid,
  p_password text,
  p_category text,
  p_content text,
  p_color text
)
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_password text;
  updated_note public.board_notes%rowtype;
begin
  select board_notes.password
  into stored_password
  from public.board_notes
  where board_notes.id = p_note_id;

  if stored_password is null then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  if btrim(p_password) <> '0000' and btrim(p_password) <> stored_password then
    raise exception 'INVALID_PASSWORD';
  end if;

  update public.board_notes
  set
    category = p_category,
    content = btrim(p_content),
    color = p_color
  where board_notes.id = p_note_id
  returning *
  into updated_note;

  return query
  select
    updated_note.id,
    updated_note.category,
    updated_note.content,
    updated_note.color,
    updated_note.position_x,
    updated_note.position_y,
    updated_note.rotation,
    updated_note.created_at,
    updated_note.updated_at;
end;
$$;

create or replace function public.delete_board_note_with_password(
  p_note_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stored_password text;
begin
  select board_notes.password
  into stored_password
  from public.board_notes
  where board_notes.id = p_note_id;

  if stored_password is null then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  if btrim(p_password) <> '0000' and btrim(p_password) <> stored_password then
    raise exception 'INVALID_PASSWORD';
  end if;

  delete from public.board_notes
  where board_notes.id = p_note_id;
end;
$$;

grant execute on function public.list_board_notes() to anon, authenticated;
grant execute on function public.create_board_note(text, text, text, text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.move_board_note(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.update_board_note_with_password(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_board_note_with_password(uuid, text) to anon, authenticated;
