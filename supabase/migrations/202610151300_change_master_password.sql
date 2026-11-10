-- 관리자용 마스터 비밀번호를 9999로 바꾼다. 다음에 바꿀 때는 is_board_master_password 한 곳만 고치면 된다.
-- 기존 함수는 p_password가 NULL이면 비교 결과가 NULL이 되어 비밀번호 검사를 건너뛰었다. 여기서 함께 막는다.

create or replace function public.is_board_master_password(p_password text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select btrim(coalesce(p_password, '')) = '9999';
$$;

-- 클라이언트가 직접 호출해 마스터 비밀번호를 떠보지 못하게 한다. 아래 security definer 함수만 사용한다.
revoke all on function public.is_board_master_password(text) from public, anon, authenticated;

create or replace function public.update_board_note_with_password(
  p_note_id uuid,
  p_password text,
  p_category text,
  p_author text,
  p_content text,
  p_color text,
  p_image_url text default null
)
returns table (
  id uuid,
  category text,
  author text,
  content text,
  color text,
  image_url text,
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

  if not public.is_board_master_password(p_password)
    and btrim(coalesce(p_password, '')) is distinct from current_note.password then
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
    author = coalesce(nullif(btrim(p_author), ''), '익명'),
    content = btrim(p_content),
    color = p_color,
    image_url = nullif(btrim(p_image_url), ''),
    sort_rank = next_sort_rank
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
    updated_note.image_url,
    updated_note.position_x,
    updated_note.position_y,
    updated_note.rotation,
    updated_note.is_pinned,
    updated_note.sort_rank,
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

  if not public.is_board_master_password(p_password)
    and btrim(coalesce(p_password, '')) is distinct from stored_password then
    raise exception 'INVALID_PASSWORD';
  end if;

  delete from public.board_notes
  where board_notes.id = p_note_id;
end;
$$;

grant execute on function public.update_board_note_with_password(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_board_note_with_password(uuid, text) to anon, authenticated;
