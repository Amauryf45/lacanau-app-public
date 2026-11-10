-- Courses par « runs » : un item reporté dans la liste triée (run n) est rayé des listes d'origine.
-- run null = pas encore reporté (apparaîtra dans le prochain run).
alter table meal_items
  add column run int,
  add column category text;
