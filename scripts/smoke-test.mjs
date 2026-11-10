/**
 * Test de bout en bout de la logique métier contre la vraie DB.
 * Production-safe : crée ses propres participants/quête de test ([TEST]…),
 * n'altère aucune donnée réelle, nettoie tout en cascade à la fin.
 * Usage : node --env-file=.env.local scripts/smoke-test.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let failures = 0;
function check(label, condition) {
  console.log(`${condition ? "✅" : "❌"} ${label}`);
  if (!condition) failures++;
}

async function cleanup() {
  await supabase.from("participants").delete().like("name", "[TEST]%");
  await supabase.from("quests").delete().like("title", "[TEST]%");
}

async function main() {
  await cleanup(); // au cas où un run précédent a crashé

  const { data: reals } = await supabase.from("participants").select("id,name").not("name", "like", "[TEST]%").order("name");
  check("au moins 13 participants réels", (reals?.length ?? 0) >= 13);
  const [r1, r2, r3] = reals;

  const { data: bots, error: botErr } = await supabase
    .from("participants")
    .insert([{ name: "[TEST] bot 1" }, { name: "[TEST] bot 2" }])
    .select();
  check("création participants de test", !botErr && bots.length === 2);
  const [bot1, bot2] = bots;

  const { data: quest, error: qErr } = await supabase
    .from("quests")
    .insert({ title: "[TEST] quête", level: "perso", points: 25, active: false })
    .select()
    .single();
  check("création quête de test", !qErr);

  // --- Quête : preuve + votes (décision à 3 votes, majorité stricte)
  const { data: completion, error: cErr } = await supabase
    .from("completions")
    .insert({ quest_id: quest.id, participant_id: bot1.id, proof_text: "[TEST] preuve" })
    .select()
    .single();
  check("dépôt de preuve", !cErr);

  const { error: selfVote } = await supabase.rpc("vote_completion", {
    p_completion: completion.id, p_voter: bot1.id, p_approve: true,
  });
  check("vote sur sa propre preuve refusé", !!selfVote);

  await supabase.rpc("vote_completion", { p_completion: completion.id, p_voter: bot2.id, p_approve: true });
  await supabase.rpc("vote_completion", { p_completion: completion.id, p_voter: r1.id, p_approve: false });
  let { data: c1 } = await supabase.from("completions").select("status").eq("id", completion.id).single();
  check("2 votes (1-1) => toujours pending", c1.status === "pending");

  await supabase.rpc("vote_completion", { p_completion: completion.id, p_voter: r2.id, p_approve: true });
  ({ data: c1 } = await supabase.from("completions").select("status").eq("id", completion.id).single());
  check("3 votes (2-1) => validée", c1.status === "validated");

  const { error: lateVote } = await supabase.rpc("vote_completion", {
    p_completion: completion.id, p_voter: r3.id, p_approve: false,
  });
  check("vote après clôture refusé", !!lateVote);

  const { data: lb } = await supabase.from("leaderboard").select("*").eq("id", bot1.id).single();
  check("classement crédite 25 pts", lb.points === 25);

  // --- Défi : cycle complet
  const { data: dare } = await supabase
    .from("dares")
    .insert({ challenger_id: bot2.id, target_id: bot1.id, title: "[TEST] défi" })
    .select()
    .single();
  await supabase.from("dares").update({ status: "accepted" }).eq("id", dare.id);
  await supabase.from("dares").update({ status: "proof_submitted", proof_text: "fait !" }).eq("id", dare.id);
  await supabase.rpc("vote_dare", { p_dare: dare.id, p_voter: bot2.id, p_approve: true });
  await supabase.rpc("vote_dare", { p_dare: dare.id, p_voter: r1.id, p_approve: true });
  await supabase.rpc("vote_dare", { p_dare: dare.id, p_voter: r2.id, p_approve: true });
  const { data: d1 } = await supabase.from("dares").select("status").eq("id", dare.id).single();
  check("défi validé après 3 votes pour", d1.status === "validated");

  const { data: lb2 } = await supabase.from("leaderboard").select("*").eq("id", bot1.id).single();
  check("classement quête + défi cumulés (50)", lb2.points === 50);

  // --- Notes anonymes
  const { data: noteId, error: nErr } = await supabase.rpc("post_note", {
    p_author: bot1.id, p_content: "[TEST] note anonyme",
  });
  check("post note anonyme", !nErr && !!noteId);

  const { data: direct, error: directErr } = await supabase.from("notes").select("*");
  check("table notes inaccessible en direct", !!directErr && !direct);

  const { data: pub } = await supabase.from("notes_public").select("*").eq("id", noteId).single();
  check("note visible via vue publique, sans auteur", pub && pub.content.includes("[TEST]") && !("author_id" in pub));
  check("note pas encore révélée", pub.revealed === false && pub.revealed_author_name === null);

  const { data: author } = await supabase.rpc("reveal_note", { p_note: noteId, p_revealer: bot2.id });
  check("révélation retourne l'auteur", author === bot1.name);

  const { data: pub2 } = await supabase.from("notes_public").select("*").eq("id", noteId).single();
  check("vue montre auteur + révélateur", pub2.revealed_author_name === bot1.name && pub2.revealed_by_name === bot2.name);

  const { data: bot2After } = await supabase.from("participants").select("joker_used").eq("id", bot2.id).single();
  check("joker consommé", bot2After.joker_used === true);

  const { data: note2 } = await supabase.rpc("post_note", { p_author: bot1.id, p_content: "[TEST] 2" });
  const { error: jokerErr } = await supabase.rpc("reveal_note", { p_note: note2, p_revealer: bot2.id });
  check("deuxième joker refusé", !!jokerErr);

  // --- Sondage : un vote par personne (upsert)
  const { data: poll } = await supabase
    .from("polls").insert({ question: "[TEST] ?", created_by: bot1.id }).select().single();
  const { data: opts } = await supabase
    .from("poll_options")
    .insert([{ poll_id: poll.id, label: "A", position: 0 }, { poll_id: poll.id, label: "B", position: 1 }])
    .select();
  await supabase.from("poll_votes").upsert({ poll_id: poll.id, option_id: opts[0].id, voter_id: bot1.id }, { onConflict: "poll_id,voter_id" });
  await supabase.from("poll_votes").upsert({ poll_id: poll.id, option_id: opts[1].id, voter_id: bot1.id }, { onConflict: "poll_id,voter_id" });
  const { data: pv } = await supabase.from("poll_votes").select("*").eq("poll_id", poll.id);
  check("changement de vote = toujours 1 seul vote", pv.length === 1 && pv[0].option_id === opts[1].id);

  // --- Chat
  const { error: mErr } = await supabase.from("messages").insert({ author_id: bot1.id, content: "[TEST] hello" });
  check("envoi message chat", !mErr);
  const { data: msgs } = await supabase.from("messages").select("*").eq("author_id", bot1.id);
  check("lecture message chat", msgs?.length === 1);

  // --- Quête journalière vidéo (5 pts/jour, validation admin)
  const today = new Date().toISOString().slice(0, 10);
  const { error: dcErr } = await supabase
    .from("daily_completions")
    .insert({ participant_id: bot1.id, day: today });
  check("déclaration vidéo du jour", !dcErr);

  const { error: dupErr } = await supabase
    .from("daily_completions")
    .insert({ participant_id: bot1.id, day: today });
  check("une seule déclaration par jour", !!dupErr);

  const { data: lbBefore } = await supabase.from("leaderboard").select("points").eq("id", bot1.id).single();
  await supabase.from("daily_completions").update({ status: "validated" })
    .eq("participant_id", bot1.id).eq("day", today);
  const { data: lbAfter } = await supabase.from("leaderboard").select("points").eq("id", bot1.id).single();
  check("validation admin => +5 pts au classement", lbAfter.points === lbBefore.points + 5);

  // --- Killer (mini-cercle entre bots, n'affecte pas la vraie partie)
  const { data: kpub } = await supabase.from("killer_public").select("*");
  check("killer_public lisible (13+ joueurs)", (kpub?.length ?? 0) >= 13);
  const { error: ksErr } = await supabase.from("killer_state").select("*");
  check("killer_state (cibles/missions) verrouillée", !!ksErr);

  await supabase.from("killer_state").insert([
    { participant_id: bot1.id, target_id: bot2.id, mission: "[TEST] mission A" },
    { participant_id: bot2.id, target_id: bot1.id, mission: "[TEST] mission B" },
  ]);
  const { data: kme1 } = await supabase.rpc("killer_me", { p_me: bot1.id });
  check("killer_me retourne cible + mission", kme1?.target_name === bot2.name && kme1?.mission === "[TEST] mission A");

  await supabase.rpc("killer_claim", { p_killer: bot1.id });
  const { data: kme2 } = await supabase.rpc("killer_me", { p_me: bot2.id });
  check("victime voit la demande anonyme", kme2?.pending_confirm === true);

  await supabase.rpc("killer_confirm", { p_victim: bot2.id, p_accept: false });
  const { data: kme1b } = await supabase.rpc("killer_me", { p_me: bot1.id });
  check("refus : tueur notifié", kme1b?.refused === true);
  await supabase.rpc("killer_ack_refusal", { p_killer: bot1.id });

  await supabase.rpc("killer_claim", { p_killer: bot1.id });
  await supabase.rpc("killer_confirm", { p_victim: bot2.id, p_accept: true });
  const { data: kdead } = await supabase.from("killer_public").select("*").eq("participant_id", bot2.id).single();
  check("kill confirmé : victime morte + mission révélée", kdead.alive === false && kdead.death_mission === "[TEST] mission A");
  const { data: kme1c } = await supabase.rpc("killer_me", { p_me: bot1.id });
  check("tueur : +1 kill et duel gagné (plus de cible)", kme1c?.kills === 1 && kme1c?.target_id === null);

  const { data: khist } = await supabase.rpc("killer_history");
  check("historique verrouillé tant que la partie court", (khist ?? []).length === 0);

  // --- Nettoyage : suppression des bots => cascade sur tout le reste
  await cleanup();
  const { data: leftovers } = await supabase.from("participants").select("id").like("name", "[TEST]%");
  const { data: leftQuests } = await supabase.from("quests").select("id").like("title", "[TEST]%");
  const { data: leftNotes } = await supabase.from("notes_public").select("id,content").like("content", "[TEST]%");
  check("nettoyage complet", leftovers.length === 0 && leftQuests.length === 0 && leftNotes.length === 0);

  console.log(failures === 0 ? "\n🎉 Tous les tests passent" : `\n💥 ${failures} échec(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("💥 Erreur inattendue :", e.message);
  await cleanup();
  process.exit(1);
});
