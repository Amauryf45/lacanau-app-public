-- Gestion des repas de la semaine : groupes de cuisine, créneaux, listes de courses
create table meal_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0
);

create table meal_group_members (
  group_id uuid not null references meal_groups(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  primary key (group_id, participant_id)
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references meal_groups(id) on delete cascade,
  day date not null,
  slot text not null check (slot in ('midi', 'soir')),
  title text,
  unique (day, slot)
);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  label text not null check (length(label) between 1 and 120),
  checked boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table meal_groups enable row level security;
alter table meal_group_members enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;

create policy allow_all on meal_groups for all using (true) with check (true);
create policy allow_all on meal_group_members for all using (true) with check (true);
create policy allow_all on meals for all using (true) with check (true);
create policy allow_all on meal_items for all using (true) with check (true);
