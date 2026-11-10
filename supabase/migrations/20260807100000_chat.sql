-- Chat de groupe
create table messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references participants(id) on delete cascade,
  content text not null check (length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table messages enable row level security;
create policy allow_all on messages for all using (true) with check (true);

create index messages_created_at_idx on messages (created_at desc);
