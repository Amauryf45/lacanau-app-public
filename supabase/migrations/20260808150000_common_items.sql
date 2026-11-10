-- Courses communes : items de liste sans plat associé (meal_id null)
alter table meal_items alter column meal_id drop not null;
