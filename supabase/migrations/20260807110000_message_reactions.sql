-- Réactions emoji sur les messages du chat
create table message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, participant_id, emoji)
);

alter table message_reactions enable row level security;
create policy allow_all on message_reactions for all using (true) with check (true);
