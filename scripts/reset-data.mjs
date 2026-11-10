/** Remise à zéro des données de test (hors Killer, profils, quêtes de base, jalons planning). */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const log = (label, res) => console.log(label, res?.error ? `ERR: ${res.error.message}` : "ok");

// Preuves de quêtes + votes (cascade)
log("completions", await supabase.from("completions").delete().not("id", "is", null));
// Défis + votes (cascade)
log("dares", await supabase.from("dares").delete().not("id", "is", null));
// Notes anonymes (table verrouillée => RPC une par une)
const { data: notes } = await supabase.from("notes_public").select("id");
for (const n of notes ?? []) await supabase.rpc("delete_note", { p_note: n.id });
console.log("notes", `ok (${notes?.length ?? 0})`);
// Sondages + options + votes (cascade)
log("polls", await supabase.from("polls").delete().not("id", "is", null));
// Chat + réactions (cascade)
log("messages", await supabase.from("messages").delete().not("id", "is", null));
// Activités hors jalons seedés + tous les partant/pas-partant
log("activity_interest", await supabase.from("activity_interest").delete().not("id", "is", null));
log(
  "activities",
  await supabase
    .from("activities")
    .delete()
    .not("title", "in", '("Arrivée & installation","Départ & grand ménage")')
);
// Quêtes perso (proposées par les joueurs)
log("quests perso", await supabase.from("quests").delete().not("created_by", "is", null));
// Jokers rendus
log("jokers", await supabase.from("participants").update({ joker_used: false }).not("id", "is", null));

// Photos : fichiers storage puis lignes
const { data: photos } = await supabase.from("photos").select("id,url");
const paths = (photos ?? [])
  .map((p) => p.url.split("/storage/v1/object/public/photos/")[1])
  .filter(Boolean)
  .map(decodeURIComponent);
if (paths.length > 0) log("storage", await supabase.storage.from("photos").remove(paths));
log("photos", await supabase.from("photos").delete().not("id", "is", null));

// État final
for (const t of ["completions", "dares", "polls", "messages", "photos", "notes_public", "activities"]) {
  const { data } = await supabase.from(t).select("id");
  console.log(`reste ${t}:`, data?.length ?? "?");
}
const { data: k } = await supabase.from("killer_public").select("alive");
console.log("killer intact:", k?.length, "joueurs,", k?.filter((x) => x.alive).length, "vivants");
