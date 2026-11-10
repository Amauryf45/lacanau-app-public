-- Accès restreint : sanction de l'orga, l'utilisateur ne peut plus utiliser que les courses
alter table participants
  add column restricted boolean not null default false,
  add column restricted_reason text,
  add column restricted_at timestamptz;
