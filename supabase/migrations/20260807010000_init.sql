-- Lacanau app — schéma initial
-- Modèle de confiance : pas d'auth, clé anon publique, politiques permissives.
-- Exception : la table notes (anonymat) n'est PAS exposée — vue + RPC uniquement.

-- =============================================================
-- PARTICIPANTS
-- =============================================================
create table participants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nickname text,
  emoji text not null default '🙂',
  joker_used boolean not null default false,
  created_at timestamptz not null default now()
);

-- =============================================================
-- QUÊTES
-- =============================================================
create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null check (level in ('soft', 'fun', 'epice', 'perso')),
  points int not null default 10,
  created_by uuid references participants(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  proof_text text,
  proof_photo_url text,
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  created_at timestamptz not null default now(),
  unique (quest_id, participant_id)
);

create table completion_votes (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references completions(id) on delete cascade,
  voter_id uuid not null references participants(id) on delete cascade,
  approve boolean not null,
  created_at timestamptz not null default now(),
  unique (completion_id, voter_id)
);

-- =============================================================
-- DÉFIS LANCÉS
-- =============================================================
create table dares (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references participants(id) on delete cascade,
  target_id uuid not null references participants(id) on delete cascade,
  title text not null,
  description text,
  points int not null default 25,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'refused', 'proof_submitted', 'validated', 'rejected')),
  proof_text text,
  proof_photo_url text,
  created_at timestamptz not null default now()
);

create table dare_votes (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references dares(id) on delete cascade,
  voter_id uuid not null references participants(id) on delete cascade,
  approve boolean not null,
  created_at timestamptz not null default now(),
  unique (dare_id, voter_id)
);

-- =============================================================
-- NOTES ANONYMES (table protégée, accès via vue + RPC)
-- =============================================================
create table notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references participants(id) on delete cascade,
  content text not null,
  revealed_by uuid references participants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table note_reactions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (note_id, participant_id, emoji)
);

-- =============================================================
-- SONDAGES
-- =============================================================
create table polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  created_by uuid not null references participants(id) on delete cascade,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  position int not null default 0
);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  voter_id uuid not null references participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

-- =============================================================
-- ACTIVITÉS & PLANNING
-- =============================================================
create table activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  proposed_by uuid references participants(id) on delete set null,
  day date,
  start_time time,
  location text,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table activity_interest (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  going boolean not null,
  created_at timestamptz not null default now(),
  unique (activity_id, participant_id)
);

-- =============================================================
-- PHOTOS
-- =============================================================
create table photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  uploaded_by uuid references participants(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =============================================================
-- CLASSEMENT (vue calculée)
-- =============================================================
create view leaderboard as
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
) s on s.pid = p.id
group by p.id, p.name, p.nickname, p.emoji;

-- =============================================================
-- VUE NOTES PUBLIQUES (sans author_id ; auteur visible si révélé)
-- =============================================================
create view notes_public as
select
  n.id,
  n.content,
  n.created_at,
  (n.revealed_by is not null) as revealed,
  rp.name as revealed_by_name,
  ap.name as revealed_author_name
from notes n
left join participants rp on rp.id = n.revealed_by
left join participants ap on ap.id = n.author_id and n.revealed_by is not null;

-- =============================================================
-- RPC
-- =============================================================

-- Poster une note anonyme
create or replace function post_note(p_author uuid, p_content text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if length(trim(p_content)) = 0 or length(p_content) > 500 then
    raise exception 'Contenu invalide';
  end if;
  insert into notes (author_id, content) values (p_author, trim(p_content)) returning id into v_id;
  return v_id;
end;
$$;

-- Utiliser son joker pour révéler l'auteur d'une note
create or replace function reveal_note(p_note uuid, p_revealer uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_author text;
begin
  if (select joker_used from participants where id = p_revealer) then
    raise exception 'Joker déjà utilisé';
  end if;
  if (select revealed_by from notes where id = p_note) is not null then
    raise exception 'Note déjà révélée';
  end if;
  update participants set joker_used = true where id = p_revealer;
  update notes set revealed_by = p_revealer where id = p_note;
  select p.name into v_author from notes n join participants p on p.id = n.author_id where n.id = p_note;
  return v_author;
end;
$$;

-- Supprimer une note (modération admin — modèle de confiance)
create or replace function delete_note(p_note uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from notes where id = p_note;
$$;

-- Voter sur une preuve de quête : décision à partir de 3 votes, majorité stricte, statut figé ensuite
create or replace function vote_completion(p_completion uuid, p_voter uuid, p_approve boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_status text;
  v_owner uuid;
  v_yes int;
  v_no int;
begin
  select status, participant_id into v_status, v_owner from completions where id = p_completion;
  if v_status is null then raise exception 'Preuve introuvable'; end if;
  if v_status <> 'pending' then raise exception 'Vote clos'; end if;
  if v_owner = p_voter then raise exception 'On ne vote pas pour soi-même 😉'; end if;

  insert into completion_votes (completion_id, voter_id, approve)
  values (p_completion, p_voter, p_approve)
  on conflict (completion_id, voter_id) do update set approve = excluded.approve;

  select count(*) filter (where approve), count(*) filter (where not approve)
    into v_yes, v_no from completion_votes where completion_id = p_completion;

  if v_yes + v_no >= 3 and v_yes <> v_no then
    update completions set status = case when v_yes > v_no then 'validated' else 'rejected' end
    where id = p_completion;
  end if;

  return (select status from completions where id = p_completion);
end;
$$;

-- Voter sur la preuve d'un défi : même règle
create or replace function vote_dare(p_dare uuid, p_voter uuid, p_approve boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_status text;
  v_target uuid;
  v_yes int;
  v_no int;
begin
  select status, target_id into v_status, v_target from dares where id = p_dare;
  if v_status is null then raise exception 'Défi introuvable'; end if;
  if v_status <> 'proof_submitted' then raise exception 'Vote clos'; end if;
  if v_target = p_voter then raise exception 'On ne vote pas pour soi-même 😉'; end if;

  insert into dare_votes (dare_id, voter_id, approve)
  values (p_dare, p_voter, p_approve)
  on conflict (dare_id, voter_id) do update set approve = excluded.approve;

  select count(*) filter (where approve), count(*) filter (where not approve)
    into v_yes, v_no from dare_votes where dare_id = p_dare;

  if v_yes + v_no >= 3 and v_yes <> v_no then
    update dares set status = case when v_yes > v_no then 'validated' else 'rejected' end
    where id = p_dare;
  end if;

  return (select status from dares where id = p_dare);
end;
$$;

-- =============================================================
-- SÉCURITÉ : RLS permissive partout, sauf notes (aucun accès direct)
-- =============================================================
alter table participants enable row level security;
alter table quests enable row level security;
alter table completions enable row level security;
alter table completion_votes enable row level security;
alter table dares enable row level security;
alter table dare_votes enable row level security;
alter table notes enable row level security;
alter table note_reactions enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table activities enable row level security;
alter table activity_interest enable row level security;
alter table photos enable row level security;

create policy allow_all on participants for all using (true) with check (true);
create policy allow_all on quests for all using (true) with check (true);
create policy allow_all on completions for all using (true) with check (true);
create policy allow_all on completion_votes for all using (true) with check (true);
create policy allow_all on dares for all using (true) with check (true);
create policy allow_all on dare_votes for all using (true) with check (true);
create policy allow_all on note_reactions for all using (true) with check (true);
create policy allow_all on polls for all using (true) with check (true);
create policy allow_all on poll_options for all using (true) with check (true);
create policy allow_all on poll_votes for all using (true) with check (true);
create policy allow_all on activities for all using (true) with check (true);
create policy allow_all on activity_interest for all using (true) with check (true);
create policy allow_all on photos for all using (true) with check (true);

-- notes : aucun accès direct pour anon/authenticated (pas de policy + revoke)
revoke all on notes from anon, authenticated;
grant select on notes_public to anon, authenticated;
grant select on leaderboard to anon, authenticated;

-- =============================================================
-- STORAGE : bucket photos public
-- =============================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy photos_read on storage.objects for select using (bucket_id = 'photos');
create policy photos_insert on storage.objects for insert with check (bucket_id = 'photos');
create policy photos_delete on storage.objects for delete using (bucket_id = 'photos');
