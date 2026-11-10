/**
 * Tirage au sort des créneaux repas (dimanche 9 → jeudi 13 août 2026) sous contraintes,
 * puis insertion des groupes + créneaux. Ne fait rien si les groupes existent déjà.
 * Usage : node --env-file=.env.local scripts/setup-meals.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DAYS = ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];
const [DIM, LUN, MAR, MER, JEU] = DAYS;

// Contraintes par groupe : jours autorisés par créneau (exemples avec les participants fictifs du seed)
const GROUPS = [
  { name: "Ange, Sam & Dani", members: ["Ange", "Sam", "Dani"],
    // Exemple : dimanche midi imposé, soir avant mercredi.
    midi: [DIM], soir: [DIM, LUN, MAR] },
  { name: "Camille, Kim & Eli", members: ["Camille", "Kim", "Eli"],
    midi: DAYS, soir: DAYS },
  { name: "Alex, Jo & Lou", members: ["Alex", "Jo", "Lou"],
    // Exemple : disponibles seulement lundi et mardi.
    midi: [LUN, MAR], soir: [LUN, MAR] },
  { name: "Sacha & Maya", members: ["Sacha", "Maya"],
    // Exemple : arrivée lundi, doit passer avant jeudi.
    midi: [LUN, MAR, MER], soir: [LUN, MAR, MER] },
  { name: "Robin & Charlie", members: ["Robin", "Charlie"],
    midi: DAYS, soir: DAYS },
];

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Backtracking : chaque groupe prend 1 midi + 1 soir sur des jours différents, créneaux uniques. */
function solve() {
  const taken = { midi: new Set(), soir: new Set() };
  const result = [];
  const order = shuffle(GROUPS.map((_, i) => i)).sort(
    (a, b) => GROUPS[a].midi.length + GROUPS[a].soir.length - (GROUPS[b].midi.length + GROUPS[b].soir.length)
  );

  function place(k) {
    if (k === order.length) return true;
    const g = GROUPS[order[k]];
    for (const midi of shuffle(g.midi)) {
      if (taken.midi.has(midi)) continue;
      for (const soir of shuffle(g.soir)) {
        if (taken.soir.has(soir) || soir === midi) continue;
        taken.midi.add(midi);
        taken.soir.add(soir);
        result[order[k]] = { midi, soir };
        if (place(k + 1)) return true;
        taken.midi.delete(midi);
        taken.soir.delete(soir);
      }
    }
    return false;
  }

  if (!place(0)) throw new Error("Aucune affectation possible — contraintes incompatibles");
  return result;
}

const { data: existing } = await supabase.from("meal_groups").select("id");
if ((existing?.length ?? 0) > 0) {
  console.log("Groupes déjà en place — rien à faire. (Supprime meal_groups pour retirer.)");
  process.exit(0);
}

const { data: participants } = await supabase.from("participants").select("id,name");
const idByName = new Map(participants.map((p) => [p.name, p.id]));
for (const g of GROUPS) {
  for (const m of g.members) {
    if (!idByName.has(m)) throw new Error(`Participant introuvable : ${m}`);
  }
}

const assignment = solve();

for (let i = 0; i < GROUPS.length; i++) {
  const g = GROUPS[i];
  const { data: group, error } = await supabase
    .from("meal_groups")
    .insert({ name: g.name, position: i })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: mErr } = await supabase
    .from("meal_group_members")
    .insert(g.members.map((name) => ({ group_id: group.id, participant_id: idByName.get(name) })));
  if (mErr) throw new Error(mErr.message);

  const { error: sErr } = await supabase.from("meals").insert([
    { group_id: group.id, day: assignment[i].midi, slot: "midi" },
    { group_id: group.id, day: assignment[i].soir, slot: "soir" },
  ]);
  if (sErr) throw new Error(sErr.message);

  console.log(`${g.name} → midi ${assignment[i].midi}, soir ${assignment[i].soir}`);
}
console.log("✅ Créneaux repas attribués");
