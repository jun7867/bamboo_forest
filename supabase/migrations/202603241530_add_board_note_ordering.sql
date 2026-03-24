alter table public.board_notes
  add column if not exists is_pinned boolean not null default false,
  add column if not exists sort_rank integer not null default 0;

with ranked_notes as (
  select
    board_notes.id,
    row_number() over (
      partition by board_notes.category, board_notes.is_pinned
      order by board_notes.created_at asc, board_notes.id asc
    ) * 1024 as next_sort_rank
  from public.board_notes
)
update public.board_notes
set sort_rank = ranked_notes.next_sort_rank
from ranked_notes
where public.board_notes.id = ranked_notes.id
  and public.board_notes.sort_rank = 0;

drop function if exists public.list_board_notes();

create function public.list_board_notes()
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  is_pinned boolean,
  sort_rank integer,
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
    board_notes.is_pinned,
    board_notes.sort_rank,
    board_notes.created_at,
    board_notes.updated_at
  from public.board_notes
  order by board_notes.created_at asc;
$$;

drop function if exists public.create_board_note(text, text, text, text, double precision, double precision, double precision);

create function public.create_board_note(
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
  is_pinned boolean,
  sort_rank integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_note public.board_notes%rowtype;
  next_sort_rank integer;
begin
  select coalesce(max(board_notes.sort_rank), 0) + 1024
  into next_sort_rank
  from public.board_notes
  where board_notes.category = p_category
    and board_notes.is_pinned = false;

  insert into public.board_notes (
    category,
    content,
    color,
    password,
    position_x,
    position_y,
    rotation,
    is_pinned,
    sort_rank
  )
  values (
    p_category,
    btrim(p_content),
    p_color,
    btrim(p_password),
    p_position_x,
    p_position_y,
    p_rotation,
    false,
    next_sort_rank
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
    inserted_note.is_pinned,
    inserted_note.sort_rank,
    inserted_note.created_at,
    inserted_note.updated_at;
end;
$$;

drop function if exists public.move_board_note(uuid, double precision, double precision);

create function public.move_board_note(
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
  is_pinned boolean,
  sort_rank integer,
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
    moved_note.is_pinned,
    moved_note.sort_rank,
    moved_note.created_at,
    moved_note.updated_at;
end;
$$;

drop function if exists public.update_board_note_with_password(uuid, text, text, text, text);

create function public.update_board_note_with_password(
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
  is_pinned boolean,
  sort_rank integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_note public.board_notes%rowtype;
  updated_note public.board_notes%rowtype;
  next_sort_rank integer;
begin
  select *
  into current_note
  from public.board_notes
  where board_notes.id = p_note_id;

  if current_note.id is null then
    raise exception 'NOTE_NOT_FOUND';
  end if;

  if btrim(p_password) <> '0000' and btrim(p_password) <> current_note.password then
    raise exception 'INVALID_PASSWORD';
  end if;

  if current_note.category <> p_category then
    select coalesce(max(board_notes.sort_rank), 0) + 1024
    into next_sort_rank
    from public.board_notes
    where board_notes.category = p_category
      and board_notes.is_pinned = current_note.is_pinned;
  else
    next_sort_rank := current_note.sort_rank;
  end if;

  update public.board_notes
  set
    category = p_category,
    content = btrim(p_content),
    color = p_color,
    sort_rank = next_sort_rank
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
    updated_note.is_pinned,
    updated_note.sort_rank,
    updated_note.created_at,
    updated_note.updated_at;
end;
$$;

create or replace function public.reorder_board_notes(
  p_category text,
  p_note_orders jsonb
)
returns table (
  id uuid,
  category text,
  content text,
  color text,
  position_x double precision,
  position_y double precision,
  rotation double precision,
  is_pinned boolean,
  sort_rank integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_count integer;
  payload_count integer;
  updated_count integer;
begin
  if jsonb_typeof(p_note_orders) <> 'array' then
    raise exception 'INVALID_PAYLOAD';
  end if;

  select count(*)
  into expected_count
  from public.board_notes
  where board_notes.category = p_category;

  select count(*)
  into payload_count
  from jsonb_to_recordset(p_note_orders) as payload(
    id uuid,
    is_pinned boolean,
    sort_rank integer
  );

  if expected_count <> payload_count then
    raise exception 'INVALID_PAYLOAD';
  end if;

  with payload as (
    select *
    from jsonb_to_recordset(p_note_orders) as payload(
      id uuid,
      is_pinned boolean,
      sort_rank integer
    )
  )
  update public.board_notes
  set
    is_pinned = payload.is_pinned,
    sort_rank = payload.sort_rank
  from payload
  where public.board_notes.id = payload.id
    and public.board_notes.category = p_category;

  get diagnostics updated_count = row_count;

  if updated_count <> expected_count then
    raise exception 'INVALID_PAYLOAD';
  end if;

  return query
  select
    board_notes.id,
    board_notes.category,
    board_notes.content,
    board_notes.color,
    board_notes.position_x,
    board_notes.position_y,
    board_notes.rotation,
    board_notes.is_pinned,
    board_notes.sort_rank,
    board_notes.created_at,
    board_notes.updated_at
  from public.board_notes
  where board_notes.category = p_category
  order by board_notes.is_pinned desc, board_notes.sort_rank asc, board_notes.created_at asc;
end;
$$;

grant execute on function public.list_board_notes() to anon, authenticated;
grant execute on function public.create_board_note(text, text, text, text, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.move_board_note(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.update_board_note_with_password(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_board_note_with_password(uuid, text) to anon, authenticated;
grant execute on function public.reorder_board_notes(text, jsonb) to anon, authenticated;
