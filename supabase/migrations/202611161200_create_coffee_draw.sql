-- 커피 내기: 판(coffee_rounds)마다 참가 신청과 메뉴(coffee_entries)를 받고, 방장이 마감하면 참가자 중에서
-- 쏘는 사람(first_pick, 커피값을 냄)과 가져오는 사람(second_pick, 커피를 가져옴)을 따로 뽑는다.
-- 로그인이 없어서 본인 확인은 기기 비밀값의 sha256으로 한다. 원문 비밀값은 DB에 남기지 않는다.
-- 쓰기는 모두 security definer RPC로만 받고, 테이블에는 읽기 정책만 둔다.
-- 글자 검증은 btrim(스페이스만 제거) 대신 정규식 \s 기준으로 해서 탭·줄바꿈만 있는 값도 빈 값으로 본다.

create table if not exists public.coffee_rounds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(regexp_replace(title, '^\s+|\s+$', '', 'g')) between 1 and 40),
  status text not null default 'open' check (status = any (array['open', 'closed'])),
  -- 쏘는 사람
  first_pick_entry_id uuid null,
  -- 가져오는 사람(돈은 안 냄)
  second_pick_entry_id uuid null,
  -- 1인당 금액은 판을 열 때 정해 둔다. 금액 정책을 바꿀 때는 이 기본값만 바꾸면 되고, 이미 열린/지난 판은 그대로다
  unit_amount integer not null default 1000 check (unit_amount > 0),
  -- 마감 시점 스냅샷. 나중에 응답이나 금액 정책이 바뀌어도 지난 기록의 금액이 바뀌지 않게 따로 저장한다
  participant_count integer null check (participant_count >= 0),
  pay_amount integer null check (pay_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz null,
  constraint coffee_rounds_state_check check (
    (
      status = 'open'
      and closed_at is null
      and participant_count is null
      and pay_amount is null
      and first_pick_entry_id is null
      and second_pick_entry_id is null
    )
    or (
      status = 'closed'
      and closed_at is not null
      and participant_count is not null
      and pay_amount = participant_count * unit_amount
      and (
        (participant_count > 0 and first_pick_entry_id is not null and second_pick_entry_id is not null)
        or (participant_count = 0 and first_pick_entry_id is null and second_pick_entry_id is null)
      )
    )
  )
);

create index if not exists coffee_rounds_created_at_idx
  on public.coffee_rounds (created_at desc);

-- 월별 순위·지난 판 목록은 마감 시각으로 기간을 자른다
create index if not exists coffee_rounds_closed_at_idx
  on public.coffee_rounds (closed_at desc)
  where status = 'closed';

-- 동시에 두 명이 새 판을 열어도 열린 판은 하나만 남게 한다
create unique index if not exists coffee_rounds_single_open_idx
  on public.coffee_rounds (status)
  where status = 'open';

-- 방장 비밀값 해시는 공개 조회 대상인 coffee_rounds와 분리해 anon이 읽을 수 없게 둔다
create table if not exists public.coffee_round_hosts (
  round_id uuid primary key references public.coffee_rounds (id) on delete cascade,
  host_secret_hash text not null
);

create table if not exists public.coffee_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.coffee_rounds (id) on delete cascade,
  client_key text not null,
  nickname text not null check (char_length(regexp_replace(nickname, '^\s+|\s+$', '', 'g')) between 1 and 20),
  menu text not null check (char_length(regexp_replace(menu, '^\s+|\s+$', '', 'g')) between 1 and 40),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coffee_entries_round_client_key unique (round_id, client_key),
  -- 당첨 컬럼이 (엔트리, 판) 쌍으로 참조해서 다른 판의 엔트리를 당첨자로 넣지 못하게 한다
  constraint coffee_entries_id_round_id_key unique (id, round_id)
);

create index if not exists coffee_entries_round_id_idx
  on public.coffee_entries (round_id);

-- 사람별 누적 순위는 client_key로 묶는다
create index if not exists coffee_entries_client_key_idx
  on public.coffee_entries (client_key, updated_at desc);

-- coffee_entries가 coffee_rounds를 참조해서 테이블을 다 만든 뒤에 당첨 FK를 단다.
-- 참가 취소는 열린 판에서만 되므로, 당첨 엔트리가 지워지지 않게 set null 대신 no action으로 막는다.
-- (판을 지우면 엔트리가 cascade로 같이 지워지고, 같은 문장 끝에 검사해서 판 삭제는 막히지 않는다)
alter table public.coffee_rounds drop constraint if exists coffee_rounds_first_pick_fkey;
alter table public.coffee_rounds
  add constraint coffee_rounds_first_pick_fkey
  foreign key (first_pick_entry_id, id)
  references public.coffee_entries (id, round_id)
  on delete no action;

alter table public.coffee_rounds drop constraint if exists coffee_rounds_second_pick_fkey;
alter table public.coffee_rounds
  add constraint coffee_rounds_second_pick_fkey
  foreign key (second_pick_entry_id, id)
  references public.coffee_entries (id, round_id)
  on delete no action;

alter table public.coffee_rounds enable row level security;
alter table public.coffee_round_hosts enable row level security;
alter table public.coffee_entries enable row level security;

drop policy if exists "Anyone can read coffee rounds" on public.coffee_rounds;
create policy "Anyone can read coffee rounds"
on public.coffee_rounds
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can read coffee entries" on public.coffee_entries;
create policy "Anyone can read coffee entries"
on public.coffee_entries
for select
to anon, authenticated
using (true);

-- pgcrypto는 Supabase에서 extensions 스키마에 있어 search_path = public으로는 digest를 못 찾는다. 내장 sha256을 쓴다
create or replace function public.hash_coffee_secret(p_secret text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

revoke all on function public.hash_coffee_secret(text) from public, anon, authenticated;

-- btrim은 스페이스만 지워서 탭·줄바꿈이 남는다. 검사 제약과 같은 \s 기준으로 앞뒤 공백을 지운다
create or replace function public.trim_coffee_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(p_value, ''), '^\s+|\s+$', '', 'g');
$$;

revoke all on function public.trim_coffee_text(text) from public, anon, authenticated;

create or replace function public.create_coffee_round(
  p_title text,
  p_host_secret text
)
returns setof public.coffee_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  created_round public.coffee_rounds%rowtype;
begin
  if p_host_secret is null or p_host_secret !~ '\S' or char_length(p_host_secret) > 200 then
    raise exception 'INVALID_SECRET';
  end if;

  if exists (select 1 from public.coffee_rounds where coffee_rounds.status = 'open') then
    raise exception 'ROUND_ALREADY_OPEN';
  end if;

  insert into public.coffee_rounds (title)
  values (public.trim_coffee_text(p_title))
  returning *
  into created_round;

  insert into public.coffee_round_hosts (round_id, host_secret_hash)
  values (created_round.id, public.hash_coffee_secret(p_host_secret));

  return next created_round;
end;
$$;

create or replace function public.upsert_coffee_entry(
  p_round_id uuid,
  p_client_secret text,
  p_nickname text,
  p_menu text
)
returns setof public.coffee_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  saved_entry public.coffee_entries%rowtype;
begin
  if p_client_secret is null or p_client_secret !~ '\S' or char_length(p_client_secret) > 200 then
    raise exception 'INVALID_SECRET';
  end if;

  -- 마감(FOR UPDATE)과 겹치면 마감이 끝날 때까지 기다렸다가 닫힌 상태를 보고 거절한다
  select coffee_rounds.status
  into current_status
  from public.coffee_rounds
  where coffee_rounds.id = p_round_id
  for share;

  if current_status is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if current_status <> 'open' then
    raise exception 'ROUND_CLOSED';
  end if;

  insert into public.coffee_entries (round_id, client_key, nickname, menu)
  values (
    p_round_id,
    public.hash_coffee_secret(p_client_secret),
    public.trim_coffee_text(p_nickname),
    public.trim_coffee_text(p_menu)
  )
  on conflict (round_id, client_key) do update
  set
    nickname = excluded.nickname,
    menu = excluded.menu,
    updated_at = timezone('utc', now())
  returning *
  into saved_entry;

  return next saved_entry;
end;
$$;

-- 참가 취소. 마감 전 판에서 본인 응답만 지운다
create or replace function public.withdraw_coffee_entry(
  p_round_id uuid,
  p_client_secret text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  if p_client_secret is null or p_client_secret !~ '\S' or char_length(p_client_secret) > 200 then
    raise exception 'INVALID_SECRET';
  end if;

  -- 마감과 겹치면 마감이 끝날 때까지 기다렸다가 닫힌 상태를 보고 거절한다
  select coffee_rounds.status
  into current_status
  from public.coffee_rounds
  where coffee_rounds.id = p_round_id
  for share;

  if current_status is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if current_status <> 'open' then
    raise exception 'ROUND_CLOSED';
  end if;

  delete from public.coffee_entries
  where coffee_entries.round_id = p_round_id
    and coffee_entries.client_key = public.hash_coffee_secret(p_client_secret);
end;
$$;

create or replace function public.close_coffee_round(
  p_round_id uuid,
  p_secret text
)
returns setof public.coffee_rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  current_round public.coffee_rounds%rowtype;
  stored_hash text;
  participant_ids uuid[];
  joined_count integer;
  first_pick uuid;
  second_pick uuid;
  closed_round public.coffee_rounds%rowtype;
begin
  select *
  into current_round
  from public.coffee_rounds
  where coffee_rounds.id = p_round_id
  for update;

  if current_round.id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  select coffee_round_hosts.host_secret_hash
  into stored_hash
  from public.coffee_round_hosts
  where coffee_round_hosts.round_id = p_round_id;

  if not public.is_board_master_password(p_secret)
    and (
      coalesce(p_secret, '') !~ '\S'
      or stored_hash is null
      or public.hash_coffee_secret(p_secret) is distinct from stored_hash
    ) then
    raise exception 'INVALID_PASSWORD';
  end if;

  if current_round.status <> 'open' then
    raise exception 'ROUND_CLOSED';
  end if;

  select array_agg(coffee_entries.id order by coffee_entries.created_at, coffee_entries.id)
  into participant_ids
  from public.coffee_entries
  where coffee_entries.round_id = p_round_id;

  joined_count := coalesce(array_length(participant_ids, 1), 0);

  -- 참가자 없이 열어 둔 판이 새 판 열기를 막지 않도록, 0명이면 뽑지 않고(pick은 null) 닫기만 한다
  if joined_count > 0 then
    -- 쏘는 사람과 가져오는 사람을 참가자 전체에서 따로 뽑는다(복원 추출). 같은 사람이 둘 다 될 수 있다
    first_pick := participant_ids[1 + floor(random() * joined_count)::integer];
    second_pick := participant_ids[1 + floor(random() * joined_count)::integer];
  end if;

  update public.coffee_rounds
  set
    status = 'closed',
    first_pick_entry_id = first_pick,
    second_pick_entry_id = second_pick,
    participant_count = joined_count,
    -- 쏘는 사람이 참가 인원만큼 낸다. 판을 열 때 정한 1인당 금액을 쓴다
    pay_amount = joined_count * current_round.unit_amount,
    closed_at = timezone('utc', now())
  where coffee_rounds.id = p_round_id
  returning *
  into closed_round;

  return next closed_round;
end;
$$;

-- 사람별 누적 순위. 기간은 마감 시각(closed_at) 기준 [p_from, p_to)이고, null이면 그쪽 끝을 열어 둔다.
-- 로그인이 없어 사람은 기기 비밀값 해시(client_key)로 묶는다. 같은 사람이 다른 기기에서 내면 다른 사람으로 집계된다.
-- 표시 이름은 기간과 관계없이 그 사람이 가장 최근에 쓴 닉네임이라 지난달 순위에서도 지금 이름으로 알아볼 수 있다
create or replace function public.get_coffee_ranking(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (
  client_key text,
  nickname text,
  paid_amount bigint,
  paid_count integer,
  fetch_count integer,
  join_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with period_rounds as (
    select
      coffee_rounds.id,
      coffee_rounds.first_pick_entry_id,
      coffee_rounds.second_pick_entry_id,
      coffee_rounds.pay_amount
    from public.coffee_rounds
    where coffee_rounds.status = 'closed'
      and (p_from is null or coffee_rounds.closed_at >= p_from)
      and (p_to is null or coffee_rounds.closed_at < p_to)
  ),
  person_stats as (
    select
      coffee_entries.client_key,
      count(*)::integer as join_count,
      count(*) filter (where coffee_entries.id = period_rounds.first_pick_entry_id)::integer as paid_count,
      -- 금액은 마감 때 저장한 스냅샷을 더한다. 1인당 금액이 바뀌어도 지난 판 금액은 그대로다
      coalesce(
        sum(period_rounds.pay_amount) filter (where coffee_entries.id = period_rounds.first_pick_entry_id),
        0
      )::bigint as paid_amount,
      count(*) filter (where coffee_entries.id = period_rounds.second_pick_entry_id)::integer as fetch_count
    from period_rounds
    join public.coffee_entries
      on coffee_entries.round_id = period_rounds.id
    group by coffee_entries.client_key
  ),
  latest_nicknames as (
    select distinct on (coffee_entries.client_key)
      coffee_entries.client_key,
      coffee_entries.nickname
    from public.coffee_entries
    where coffee_entries.client_key in (select person_stats.client_key from person_stats)
    order by coffee_entries.client_key, coffee_entries.updated_at desc, coffee_entries.id desc
  )
  select
    person_stats.client_key,
    latest_nicknames.nickname,
    person_stats.paid_amount,
    person_stats.paid_count,
    person_stats.fetch_count,
    person_stats.join_count
  from person_stats
  join latest_nicknames
    on latest_nicknames.client_key = person_stats.client_key
  order by
    person_stats.paid_amount desc,
    person_stats.paid_count desc,
    person_stats.fetch_count desc,
    person_stats.join_count desc,
    latest_nicknames.nickname,
    person_stats.client_key;
$$;

grant execute on function public.create_coffee_round(text, text) to anon, authenticated;
grant execute on function public.upsert_coffee_entry(uuid, text, text, text) to anon, authenticated;
grant execute on function public.withdraw_coffee_entry(uuid, text) to anon, authenticated;
grant execute on function public.close_coffee_round(uuid, text) to anon, authenticated;
grant execute on function public.get_coffee_ranking(timestamptz, timestamptz) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.coffee_rounds;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.coffee_entries;
exception
  when duplicate_object then null;
end
$$;
