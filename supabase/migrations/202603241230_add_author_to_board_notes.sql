alter table public.board_notes
add column if not exists author text not null default '익명';

update public.board_notes
set author = '익명'
where btrim(coalesce(author, '')) = '';

alter table public.board_notes
alter column author set default '익명';

create or replace function public.list_board_notes()
returns table (
  id uuid,
  category text,
  author text,
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
    board_notes.author,
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
  p_author text,
  p_password text,
  p_position_x double precision,
  p_position_y double precision,
  p_rotation double precision
)
returns table (
  id uuid,
  category text,
  author text,
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
    author,
    content,
    color,
    password,
    position_x,
    position_y,
    rotation
  )
  values (
    p_category,
    coalesce(nullif(btrim(p_author), ''), '익명'),
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
    inserted_note.author,
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
  author text,
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
    moved_note.author,
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
  p_author text,
  p_content text,
  p_color text
)
returns table (
  id uuid,
  category text,
  author text,
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
    author = coalesce(nullif(btrim(p_author), ''), '익명'),
    content = btrim(p_content),
    color = p_color
  where board_notes.id = p_note_id
  returning *
  into updated_note;

  return query
  select
    updated_note.id,
    updated_note.category,
    updated_note.author,
    updated_note.content,
    updated_note.color,
    updated_note.position_x,
    updated_note.position_y,
    updated_note.rotation,
    updated_note.created_at,
    updated_note.updated_at;
end;
$$;

grant execute on function public.list_board_notes() to anon, authenticated;
grant execute on function public.create_board_note(text, text, text, text, text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.move_board_note(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.update_board_note_with_password(uuid, text, text, text, text, text) to anon, authenticated;
