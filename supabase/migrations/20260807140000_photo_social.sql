-- Commentaires et réactions sur les photos
create table photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  content text not null check (length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create table photo_reactions (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (photo_id, participant_id, emoji)
);

alter table photo_comments enable row level security;
alter table photo_reactions enable row level security;
create policy allow_all on photo_comments for all using (true) with check (true);
create policy allow_all on photo_reactions for all using (true) with check (true);
