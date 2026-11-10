-- Quête journalière « Ajouter une vidéo au drive » : 5 pts/jour, validée par l'admin
create table daily_completions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  day date not null,
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  created_at timestamptz not null default now(),
  unique (participant_id, day)
);

alter table daily_completions enable row level security;
create policy allow_all on daily_completions for all using (true) with check (true);

-- Le classement compte désormais : quêtes validées + défis réussis + 5 pts par vidéo validée
create or replace view leaderboard as
select
  p.id,
  p.name,
  p.nickname,
  p.emoji,
  coalesce(sum(s.pts), 0)::int as points
from participants p
left join (
  select c.participant_id as pid, q.points as pts
  from completions c
  join quests q on q.id = c.quest_id
  where c.status = 'validated'
  union all
  select d.target_id as pid, d.points as pts
  from dares d
  where d.status = 'validated'
  union all
  select dc.participant_id as pid, 5 as pts
  from daily_completions dc
  where dc.status = 'validated'
) s on s.pid = p.id
group by p.id, p.name, p.nickname, p.emoji;
