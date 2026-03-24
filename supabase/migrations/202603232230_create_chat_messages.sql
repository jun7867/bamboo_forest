create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  alias text not null check (char_length(btrim(alias)) between 1 and 40),
  message text not null check (char_length(btrim(message)) between 1 and 300),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at asc);

alter table public.chat_messages enable row level security;

drop policy if exists "Anyone can read chat messages" on public.chat_messages;
create policy "Anyone can read chat messages"
on public.chat_messages
for select
to anon, authenticated
using (true);

drop policy if exists "Anyone can insert chat messages" on public.chat_messages;
create policy "Anyone can insert chat messages"
on public.chat_messages
for insert
to anon, authenticated
with check (
  char_length(btrim(alias)) between 1 and 40
  and char_length(btrim(message)) between 1 and 300
);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end
$$;
