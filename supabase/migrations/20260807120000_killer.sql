-- Killer : jeu d'élimination entre participants. Ce fichier contient le pool de missions.

create table killer_missions (
  id uuid primary key default gen_random_uuid(),
  text text not null
);

create table killer_state (
  participant_id uuid primary key references participants(id) on delete cascade,
  target_id uuid references participants(id) on delete set null,
  mission text,
  alive boolean not null default true,
  kills int not null default 0,
  killed_at timestamptz,
  death_mission text,
  pending_confirm boolean not null default false,
  refused boolean not null default false
);

create table killer_events (
  id uuid primary key default gen_random_uuid(),
  killer_id uuid references participants(id) on delete cascade,
  victim_id uuid references participants(id) on delete cascade,
  mission text,
  created_at timestamptz not null default now()
);

-- Pool de missions (style killer classique, adapté vacances)
insert into killer_missions (text) values
  ('Faire dire à ta cible le mot « pamplemousse » dans une conversation'),
  ('Faire porter à ta cible un objet à toi pendant 10 minutes sans qu''elle se doute de rien'),
  ('Faire chanter à ta cible au moins une phrase d''une chanson'),
  ('Faire trinquer ta cible avec toi en la regardant dans les yeux plus de 5 secondes'),
  ('Faire dire à ta cible « j''ai trop chaud » ou « j''ai trop froid »'),
  ('Faire prendre à ta cible une photo de toi'),
  ('Faire tenir à ta cible ta serviette de plage'),
  ('Obtenir de ta cible qu''elle te fasse un compliment'),
  ('Faire raconter à ta cible un souvenir d''enfance'),
  ('Faire dire à ta cible le prénom d''un autre participant trois fois dans la même conversation'),
  ('Faire goûter à ta cible quelque chose que tu manges ou bois'),
  ('Faire applaudir ta cible'),
  ('Faire imiter un animal à ta cible (son ou geste)'),
  ('Faire dire à ta cible « c''est une excellente idée »'),
  ('Faire ramasser à ta cible un objet que tu as fait tomber « par accident »'),
  ('Faire toucher du sable à ta cible alors que vous n''êtes pas sur la plage'),
  ('Faire deviner à ta cible un mot au jeu du mime (n''importe quel mot)'),
  ('Faire prêter à ta cible ses lunettes de soleil'),
  ('Faire dire à ta cible quel est son plat préféré'),
  ('Faire faire à ta cible un high-five'),
  ('Faire répéter à ta cible une phrase que tu viens de dire (« quoi ? » ne compte pas)'),
  ('Faire choisir à ta cible entre deux options que tu proposes (ex : mer ou piscine)'),
  ('Faire rire ta cible aux éclats'),
  ('Faire dire à ta cible une phrase complète en anglais ou en espagnol');

-- Attribution initiale : cercle aléatoire + mission aléatoire distincte par joueur
with shuffled as (
  select id,
         row_number() over (order by random()) as rn,
         count(*) over () as n
  from participants
  where name not like '[TEST]%'
),
missions as (
  select text, row_number() over (order by random()) as rn
  from killer_missions
)
insert into killer_state (participant_id, target_id, mission)
select s.id, nxt.id, m.text
from shuffled s
join shuffled nxt on nxt.rn = (s.rn % s.n) + 1
join missions m on m.rn = s.rn;

-- =============================================================
-- Sécurité : aucune lecture directe (cibles/missions secrètes)
-- =============================================================
alter table killer_missions enable row level security;
alter table killer_state enable row level security;
alter table killer_events enable row level security;

revoke all on killer_missions from anon, authenticated;
revoke all on killer_state from anon, authenticated;
revoke all on killer_events from anon, authenticated;

-- insert-only pour les tests automatisés (modèle de confiance)
grant insert on killer_state to anon, authenticated;
create policy insert_only on killer_state for insert with check (true);

-- Vue publique : état du jeu sans les secrets
create view killer_public as
select participant_id, alive, kills, killed_at, death_mission
from killer_state;

grant select on killer_public to anon, authenticated;

-- =============================================================
-- RPC
-- =============================================================

-- Mon état : ma cible, ma mission, mes flags (les secrets des autres restent cachés)
create or replace function killer_me(p_me uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v killer_state%rowtype;
  t participants%rowtype;
  t_pending boolean := false;
begin
  select * into v from killer_state where participant_id = p_me;
  if not found then return null; end if;
  if v.target_id is not null then
    select * into t from participants where id = v.target_id;
    select pending_confirm into t_pending from killer_state where participant_id = v.target_id;
  end if;
  return json_build_object(
    'alive', v.alive,
    'kills', v.kills,
    'death_mission', v.death_mission,
    'refused', v.refused,
    'pending_confirm', v.pending_confirm,
    'mission', case when v.alive then v.mission end,
    'target_id', case when v.alive then v.target_id end,
    'target_name', case when v.alive and t.id is not null then coalesce(nullif(trim(t.nickname), ''), t.name) end,
    'target_emoji', case when v.alive and t.id is not null then t.emoji end,
    'target_pending', coalesce(t_pending, false)
  );
end;
$$;

-- Le tueur déclare son kill : la victime reçoit une demande de confirmation anonyme
create or replace function killer_claim(p_killer uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_target uuid;
begin
  select target_id into v_target from killer_state where participant_id = p_killer and alive;
  if v_target is null then raise exception 'Pas de cible à tuer'; end if;
  if (select pending_confirm from killer_state where participant_id = v_target) then
    raise exception 'Demande déjà en attente';
  end if;
  update killer_state set pending_confirm = true where participant_id = v_target;
end;
$$;

-- La victime confirme (meurt) ou refuse (le tueur est notifié)
create or replace function killer_confirm(p_victim uuid, p_accept boolean)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_killer uuid;
  v_kill_mission text;
  v_victim_target uuid;
  v_victim_mission text;
begin
  if not coalesce((select pending_confirm from killer_state where participant_id = p_victim), false) then
    raise exception 'Aucune demande en attente';
  end if;

  select participant_id, mission into v_killer, v_kill_mission
  from killer_state where target_id = p_victim and alive
  limit 1;
  if v_killer is null then raise exception 'Tueur introuvable'; end if;

  if not p_accept then
    update killer_state set pending_confirm = false where participant_id = p_victim;
    update killer_state set refused = true where participant_id = v_killer;
    return 'refused';
  end if;

  select target_id, mission into v_victim_target, v_victim_mission
  from killer_state where participant_id = p_victim;

  update killer_state
  set alive = false, killed_at = now(), death_mission = v_kill_mission,
      pending_confirm = false, target_id = null, mission = null
  where participant_id = p_victim;

  if v_victim_target = v_killer then
    -- duel final : plus personne à tuer
    update killer_state set kills = kills + 1, target_id = null, mission = null, refused = false
    where participant_id = v_killer;
  else
    update killer_state set kills = kills + 1, target_id = v_victim_target, mission = v_victim_mission, refused = false
    where participant_id = v_killer;
  end if;

  insert into killer_events (killer_id, victim_id, mission) values (v_killer, p_victim, v_kill_mission);
  return 'confirmed';
end;
$$;

-- Le tueur a vu la notification de refus
create or replace function killer_ack_refusal(p_killer uuid)
returns void
language sql security definer set search_path = public
as $$
  update killer_state set refused = false where participant_id = p_killer;
$$;

-- Historique complet — révélé UNIQUEMENT quand la partie est finie
create or replace function killer_history()
returns table (killer_name text, victim_name text, mission text, happened_at timestamptz)
language sql security definer set search_path = public
as $$
  select
    coalesce(nullif(trim(pk.nickname), ''), pk.name),
    coalesce(nullif(trim(pv.nickname), ''), pv.name),
    e.mission,
    e.created_at
  from killer_events e
  join participants pk on pk.id = e.killer_id
  join participants pv on pv.id = e.victim_id
  where (select count(*) from killer_state where alive) <= 1
  order by e.created_at;
$$;
