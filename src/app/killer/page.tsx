"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "@/lib/session";
import { useKillerMe, useKillerPublic, useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Avatar, PageHeader, Sheet, Spinner } from "@/components/ui";
import { displayName } from "@/lib/types";
import type { KillerHistoryRow } from "@/lib/types";

function formatKillDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) +
    ` à ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function KillerPage() {
  const { session, ready } = useSession();
  const { data: game, mutate: mutateGame } = useKillerPublic();
  const { data: me, mutate: mutateMe } = useKillerMe(session?.participantId ?? null);
  const { data: participants } = useParticipants();

  const [confirmKillOpen, setConfirmKillOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);

  const aliveCount = (game ?? []).filter((g) => g.alive).length;
  const gameOver = (game ?? []).length > 0 && aliveCount <= 1;

  const { data: history } = useSWR<KillerHistoryRow[]>(
    gameOver ? "killer_history" : null,
    async () => {
      const { data, error } = await supabase.rpc("killer_history");
      if (error) throw new Error(error.message);
      return data as KillerHistoryRow[];
    }
  );

  if (!ready || !session) return <Spinner />;
  if (!game || !participants || me === undefined) return <Spinner />;

  const myId = session.participantId;

  async function refresh() {
    await Promise.all([mutateGame(), mutateMe()]);
  }

  async function claim() {
    setBusy(true);
    const { error } = await supabase.rpc("killer_claim", { p_killer: myId });
    if (error) alert(error.message);
    setConfirmKillOpen(false);
    await refresh();
    setBusy(false);
  }

  async function confirmDeath(accept: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("killer_confirm", { p_victim: myId, p_accept: accept });
    if (error) alert(error.message);
    await refresh();
    setBusy(false);
  }

  async function ackRefusal() {
    await supabase.rpc("killer_ack_refusal", { p_killer: myId });
    await refresh();
  }

  const ranking = (game ?? [])
    .filter((g) => g.kills > 0)
    .sort((a, b) => b.kills - a.kills);
  const winner = gameOver ? (game ?? []).find((g) => g.alive) : null;
  const deadList = (game ?? [])
    .filter((g) => !g.alive)
    .sort((a, b) => ((a.killed_at ?? "") < (b.killed_at ?? "") ? 1 : -1));

  return (
    <main>
      <PageHeader
        emoji="🔪"
        title="Killer"
        subtitle={gameOver ? "La partie est terminée." : `${aliveCount} survivant${aliveCount > 1 ? "s" : ""} sur ${game.length}. Confiance en personne.`}
      />

      {/* ---- Partie terminée ---- */}
      {gameOver && (
        <section className="mx-4 space-y-4">
          {winner && (
            <div className="card !border-amber-300 !bg-amber-50 text-center">
              <p className="text-4xl">👑</p>
              <p className="mt-1 text-xl font-black text-slate-800">
                {displayName(byId.get(winner.participant_id) ?? { name: "?", nickname: null })} survit et remporte le Killer !
              </p>
              <p className="text-sm font-bold text-amber-700">{winner.kills} kill{winner.kills > 1 ? "s" : ""}</p>
            </div>
          )}

          {ranking.length > 0 && (
            <div className="card">
              <h2 className="font-black text-slate-700">🏆 Tableau de chasse</h2>
              <ul className="mt-2 space-y-1.5">
                {ranking.map((g, i) => (
                  <li key={g.participant_id} className="flex items-center gap-2">
                    <span className="w-6 text-center font-black text-slate-400">{i + 1}</span>
                    <Avatar participant={byId.get(g.participant_id) ?? null} size="sm" />
                    <span className="font-bold text-slate-700">
                      {displayName(byId.get(g.participant_id) ?? { name: "?", nickname: null })}
                    </span>
                    <span className="ml-auto font-black text-rose-600">{g.kills} 🔪</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2 className="font-black text-slate-700">📜 L&apos;histoire complète</h2>
            {!history ? (
              <Spinner />
            ) : (
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li key={`${h.happened_at}-${h.victim_name}`} className="text-sm font-semibold text-slate-600">
                    🔪 <span className="font-black">{h.killer_name}</span> a tué{" "}
                    <span className="font-black">{h.victim_name}</span> en lui faisant « {h.mission} »
                    <span className="block text-xs font-bold text-slate-400">{formatKillDate(h.happened_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ---- Partie en cours ---- */}
      {!gameOver && (
        <section className="mx-4 space-y-4">
          {/* Pas dans la partie */}
          {me === null && (
            <div className="card text-center">
              <p className="text-3xl">🫥</p>
              <p className="mt-1 font-bold text-slate-600">
                Tu n&apos;es pas dans la partie (elle a démarré sans toi). Console-toi au beach-volley.
              </p>
            </div>
          )}

          {/* Demande de confirmation : on m'a tué ? */}
          {me?.alive && me.pending_confirm && (
            <div className="card !border-rose-300 !bg-rose-50">
              <p className="text-center text-3xl">☠️</p>
              <h2 className="mt-1 text-center font-black text-rose-800">
                Tu as été kill. Confirmes-tu ?
              </h2>
              <p className="mt-1 text-center text-xs font-bold text-rose-400">
                (on ne te dira pas qui, évidemment)
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => confirmDeath(true)} disabled={busy} className="btn-primary flex-1 !bg-rose-600 !shadow-rose-600/20">
                  ⚰️ Oui, je suis mort·e
                </button>
                <button onClick={() => confirmDeath(false)} disabled={busy} className="btn-ghost flex-1">
                  ✋ Non, je conteste
                </button>
              </div>
            </div>
          )}

          {/* Notification de refus */}
          {me?.alive && me.refused && (
            <div className="card !border-amber-300 !bg-amber-50">
              <p className="font-bold text-amber-800">
                😤 Ta victime a refusé le kill. S&apos;il y a conflit, c&apos;est l&apos;admin qui tranche.
              </p>
              <button onClick={ackRefusal} className="mt-2 text-sm font-black text-amber-700">
                OK, vu
              </button>
            </div>
          )}

          {/* Je suis mort */}
          {me && !me.alive && (
            <div className="card text-center">
              <p className="text-4xl">💀</p>
              <p className="mt-2 font-black text-slate-700">
                Tu as été tué·e en faisant :
              </p>
              <p className="mt-1 font-semibold text-slate-600">« {me.death_mission} »</p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                Par qui ? Mystère. Tu le sauras à la fin. 🍿
              </p>
              {me.kills > 0 && (
                <p className="mt-2 text-sm font-bold text-rose-600">
                  Tu pars avec {me.kills} kill{me.kills > 1 ? "s" : ""} au compteur.
                </p>
              )}
            </div>
          )}

          {/* Je suis vivant : ma cible et ma mission */}
          {me?.alive && (
            <div className="card !border-slate-700 !bg-slate-800 text-white">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ta cible</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl">{me.target_emoji}</span>
                <span className="text-xl font-black">{me.target_name}</span>
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">Ta mission</p>
              <p className="mt-1 font-semibold">{me.mission}</p>
              {me.target_pending ? (
                <p className="mt-4 text-center text-sm font-bold text-amber-400">
                  ⏳ En attente de confirmation de ta victime…
                </p>
              ) : (
                <button
                  onClick={() => setConfirmKillOpen(true)}
                  className="btn-primary mt-4 w-full !bg-rose-600 !shadow-rose-600/30"
                >
                  🔪 J&apos;ai réussi mon kill
                </button>
              )}
              <p className="mt-3 text-center text-[11px] font-bold text-slate-500">
                Motus : ta cible et ta mission ne regardent que toi.
              </p>
            </div>
          )}

          {/* Cimetière */}
          {deadList.length > 0 && (
            <div className="card">
              <h2 className="font-black text-slate-700">🪦 Cimetière ({deadList.length})</h2>
              <ul className="mt-2 space-y-2">
                {deadList.map((g) => (
                  <li key={g.participant_id} className="flex items-start gap-2 text-sm">
                    <Avatar participant={byId.get(g.participant_id) ?? null} size="sm" />
                    <span className="font-semibold text-slate-600">
                      <span className="font-black">
                        {displayName(byId.get(g.participant_id) ?? { name: "?", nickname: null })}
                      </span>{" "}
                      est tombé·e en faisant « {g.death_mission} »
                      {g.killed_at && (
                        <span className="block text-xs font-bold text-slate-400">{formatKillDate(g.killed_at)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <Sheet open={confirmKillOpen} onClose={() => setConfirmKillOpen(false)} title="Confirmer le kill 🔪">
        <p className="font-semibold text-slate-600">
          Ta victime <span className="font-black">{me?.target_name}</span> va recevoir une demande de
          confirmation <span className="font-black">anonyme</span>. Si elle accepte, elle est morte et tu
          hérites de sa cible. Si elle refuse… direction l&apos;admin.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setConfirmKillOpen(false)} className="btn-ghost flex-1">
            Pas encore
          </button>
          <button onClick={claim} disabled={busy} className="btn-primary flex-1 !bg-rose-600 !shadow-rose-600/20">
            {busy ? "…" : "🔪 Je confirme"}
          </button>
        </div>
      </Sheet>
    </main>
  );
}
