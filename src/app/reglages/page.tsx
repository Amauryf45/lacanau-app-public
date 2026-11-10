"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, clearSession, isVisitor } from "@/lib/session";
import { useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { PageHeader, Spinner } from "@/components/ui";
import { AVATAR_EMOJIS } from "@/lib/types";
import type { Diet } from "@/lib/types";

export default function ReglagesPage() {
  const { session, ready } = useSession();
  const { data: participants, mutate } = useParticipants();

  const me = participants?.find((p) => p.id === session?.participantId);
  const [nickname, setNickname] = useState("");
  const [emoji, setEmoji] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) {
      setNickname(me.nickname ?? "");
      setEmoji(me.emoji);
    }
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !session) return <Spinner />;

  if (isVisitor(session)) {
    return (
      <main>
        <PageHeader emoji="👀" title="Mode visiteur" subtitle="Lecture seule — tu regardes, ils transpirent." />
        <section className="mx-4 space-y-4">
          <button
            onClick={() => {
              clearSession();
              window.location.href = "/onboarding";
            }}
            className="btn-ghost w-full"
          >
            🔄 Changer de profil
          </button>
        </section>
      </main>
    );
  }

  if (!me) return <Spinner />;

  const takenEmojis = new Set(
    (participants ?? []).filter((p) => p.id !== me?.id).map((p) => p.emoji)
  );

  async function save() {
    if (emoji && emoji !== me?.emoji && takenEmojis.has(emoji)) {
      alert("Cet avatar est déjà pris par quelqu'un d'autre 😅");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("participants")
      .update({ nickname: nickname.trim() || null, emoji: emoji || "🙂" })
      .eq("id", session!.participantId);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    mutate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function switchProfile() {
    if (confirm("Changer de profil ? (pour prêter le téléphone, pas pour tricher 😉)")) {
      clearSession();
      window.location.href = "/onboarding";
    }
  }

  return (
    <main>
      <PageHeader emoji="⚙️" title="Réglages" subtitle={`Profil : ${me.name}`} />

      <section className="mx-4 space-y-4">
        <div className="card">
          <label className="block text-sm font-bold text-slate-600">
            Ton pseudo
            <input
              className="input mt-1"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={me.name}
              maxLength={20}
            />
          </label>

          <p className="mt-4 text-sm font-bold text-slate-600">Ton avatar</p>
          <div className="mt-2 grid grid-cols-8 gap-1">
            {AVATAR_EMOJIS.map((e) => {
              const taken = takenEmojis.has(e) && e !== emoji;
              return (
                <button
                  key={e}
                  onClick={() => !taken && setEmoji(e)}
                  disabled={taken}
                  className={`rounded-xl p-1.5 text-xl transition ${
                    emoji === e ? "bg-ocean-200 scale-110" : taken ? "opacity-25 grayscale" : "active:bg-ocean-50"
                  }`}
                >
                  {e}
                </button>
              );
            })}
          </div>

          <button onClick={save} disabled={busy} className="btn-primary mt-4 w-full">
            {saved ? "✅ Enregistré !" : busy ? "…" : "Enregistrer"}
          </button>
        </div>

        <div className="card">
          <p className="text-sm font-bold text-slate-600">🍳 À table, tu manges…</p>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["vegetarien", "🥦 Végétarien"],
                ["omnivore", "🍖 De tout"],
              ] as [Diet, string][]
            ).map(([diet, label]) => (
              <button
                key={diet}
                onClick={async () => {
                  await supabase.from("participants").update({ diet }).eq("id", session!.participantId);
                  mutate();
                }}
                className={`flex-1 rounded-xl py-2.5 font-bold transition active:scale-95 ${
                  me.diet === diet ? "bg-ocean-600 text-white" : "bg-ocean-50 text-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="text-sm font-bold text-slate-600">
            Joker de révélation : {me.joker_used ? "utilisé 🃏❌" : "disponible 🃏✨"}
          </p>
        </div>

        <Link href="/regles" className="btn-ghost w-full">
          ❓ Les règles du jeu
        </Link>

        <button onClick={switchProfile} className="btn-ghost w-full">
          🔄 Changer de profil
        </button>

        <Link href="/admin" className="block text-center text-xs font-semibold text-slate-300">
          Accès organisateur
        </Link>
      </section>
    </main>
  );
}
