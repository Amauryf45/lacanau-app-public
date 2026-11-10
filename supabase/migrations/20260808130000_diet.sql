-- Préférence alimentaire : demandée à l'arrivée dans l'app, modifiable dans les réglages
alter table participants
  add column diet text check (diet in ('vegetarien', 'omnivore'));
