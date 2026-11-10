-- Lacanau app — données initiales

-- Participants (13, fictifs)
insert into participants (name, emoji) values
  ('Alex', '🏄'),
  ('Sam', '🌞'),
  ('Camille', '🍻'),
  ('Lou', '🌊'),
  ('Maya', '🦩'),
  ('Eli', '🐚'),
  ('Robin', '🔥'),
  ('Sacha', '🍉'),
  ('Charlie', '🎣'),
  ('Dani', '🏐'),
  ('Jo', '🌴'),
  ('Kim', '🍹'),
  ('Ange', '🎸');

-- Quêtes de base (30) — soft 10 pts / fun 20 pts / épicé 30 pts
insert into quests (title, description, level, points) values
  -- Soft
  ('Baignade avant 9h', 'Se baigner dans l''océan avant 9h du matin, témoin exigé.', 'soft', 10),
  ('Chef d''un soir', 'Cuisiner le dîner pour toute la maison, entrée comprise.', 'soft', 10),
  ('Château de sable royal', 'Construire un château de sable avec au moins 4 tours et des douves.', 'soft', 10),
  ('Plage propre', 'Ramasser 10 déchets sur la plage en une session.', 'soft', 10),
  ('Magicien du groupe', 'Apprendre un tour de magie et le présenter au groupe le soir.', 'soft', 10),
  ('Petit-déj des champions', 'Préparer le petit-déjeuner pour toute la maison avant que tout le monde se lève.', 'soft', 10),
  ('Roi de la pétanque', 'Gagner une partie de pétanque officielle (au moins 4 joueurs).', 'soft', 10),
  ('Golden hour', 'Organiser LA photo de groupe au coucher du soleil.', 'soft', 10),
  ('Marcheur du désert', 'Marcher 30 minutes pieds nus sur le sable chaud sans se plaindre.', 'soft', 10),
  ('Maître du jeu', 'Organiser une soirée jeux et faire jouer au moins 8 personnes.', 'soft', 10),
  -- Fun
  ('Baignade tout habillé', 'Se baigner entièrement habillé (chaussures comprises).', 'fun', 20),
  ('L''imitateur', 'Imiter un participant jusqu''à ce que le groupe devine qui c''est, 3 fois.', 'fun', 20),
  ('Danse avec les inconnus', 'Danser 1 minute complète devant des inconnus sur la plage.', 'fun', 20),
  ('Concert privé', 'Chanter une chanson entière à tue-tête dans un lieu public.', 'fun', 20),
  ('L''accent mystère', 'Parler avec un accent toute une soirée sans craquer.', 'fun', 20),
  ('Bronzage sur 10', 'Demander à un inconnu de noter son bronzage sur 10.', 'fun', 20),
  ('Roméo du parasol', 'Faire une déclaration d''amour théâtrale à un parasol, en public.', 'fun', 20),
  ('Défilé au marché', 'Aller au marché dans un déguisement improvisé avec ce qu''il y a dans la maison.', 'fun', 20),
  ('La ola', 'Lancer une ola et la faire suivre par au moins 5 inconnus sur la plage.', 'fun', 20),
  ('Menu mystère', 'Cuisiner un plat avec 3 ingrédients imposés par le groupe. Il doit être mangé.', 'fun', 20),
  -- Épicé
  ('Bain de minuit', 'Un classique. Après minuit, dans l''océan. Photo de la serviette en preuve.', 'epice', 30),
  ('Un verre offert', 'Se faire offrir un verre par un(e) inconnu(e).', 'epice', 30),
  ('Le numéro', 'Obtenir le numéro d''un(e) inconnu(e) (vérifiable).', 'epice', 30),
  ('Distributeur de compliments', 'Faire un compliment sincère à 5 inconnus dans la même journée.', 'epice', 30),
  ('Star du karaoké', 'Improviser un karaoké dans un bar qui n''en propose pas.', 'epice', 30),
  ('Identité secrète', 'Se présenter à des inconnus avec une fausse identité invraisemblable et tenir 10 minutes.', 'epice', 30),
  ('Danse sur le bar', 'Danser sur le bar (avec la bénédiction du barman).', 'epice', 30),
  ('Punchlines', 'Placer 3 phrases d''accroche volontairement nulles à des inconnus dans la soirée.', 'epice', 30),
  ('Littéralement épicé', 'Finir le plat le plus relevé du resto sans boire pendant 2 minutes.', 'epice', 30),
  ('L''aube des braves', 'Se jeter dans l''océan au lever du soleil après avoir tenu la nuit blanche.', 'epice', 30);

-- Planning : jalons fixes de la semaine
insert into activities (title, description, day, start_time, location, status) values
  ('Arrivée & installation', 'Tout le monde débarque, on s''installe, premier apéro.', '2026-08-08', '16:00', 'La maison', 'confirmed'),
  ('Départ & grand ménage', 'On rend la maison nickel et on se dit au revoir 😢', '2026-08-15', '10:00', 'La maison', 'confirmed');
