"use client";

import { useState } from "react";
import { useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { setSession, VISITOR_ID } from "@/lib/session";
import { Avatar, Spinner } from "@/components/ui";
import { AVATAR_EMOJIS } from "@/lib/types";
import type { Participant } from "@/lib/types";

export default function OnboardingPage() {
  const { data: participants } = useParticipants();
  const [selected, setSelected] = useState<Participant | null>(null);
  const [nickname, setNickname] = useState("");
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const takenEmojis = new Set(
    (participants ?? []).filter((p) => p.id !== selected?.id).map((p) => p.emoji)
  );

  async function confirm() {
    if (!selected) return;
    if (emoji && emoji !== selected.emoji && takenEmojis.has(emoji)) {
      setError("Cet avatar vient d'être pris, choisis-en un autre 😅");
      return;
    }
    setSaving(true);
    setError("");
    const updates: Partial<Participant> = {};
    if (nickname.trim()) updates.nickname = nickname.trim();
    if (emoji) updates.emoji = emoji;
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("participants").update(updates).eq("id", selected.id);
      if (error) {
        setError("Oups, impossible d'enregistrer. Réessaie !");
        setSaving(false);
        return;
      }
    }
    setSession({ participantId: selected.id, name: selected.name });
    window.location.href = "/";
  }

  return (
    <main className="px-4 pt-10">
      <div className="text-center">
        <div className="text-6xl">⛱️</div>
        <h1 className="mt-3 text-3xl font-black text-slate-800">Lacanau 2026</h1>
        <p className="mt-2 text-slate-500 font-semibold">
          Du 8 au 15 août · 13 joyeux drilles · zéro répit
        </p>
      </div>

      {!selected ? (
        <>
          <h2 className="mt-8 mb-3 text-lg font-black text-slate-700">Qui es-tu ? 👀</h2>
          {!participants ? (
            <Spinner />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      setEmoji(p.emoji);
                      setNickname(p.nickname ?? "");
                    }}
                    className="card flex items-center gap-3 !p-3 text-left active:scale-95 transition"
                  >
                    <Avatar participant={p} />
                    <span className="font-bold text-slate-700">{p.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setSession({ participantId: VISITOR_ID, name: "Visiteur" });
                  window.location.href = "/";
                }}
                className="mt-4 mb-6 w-full text-center text-sm font-bold text-slate-400"
              >
                👀 Je ne suis pas de la semaine — entrer en visiteur (lecture seule)
              </button>
            </>
          )}
        </>
      ) : (
        <div className="card mt-8">
          <div className="flex items-center gap-3">
            <Avatar participant={{ ...selected, emoji: emoji || selected.emoji }} size="lg" />
            <div>
              <p className="text-lg font-black text-slate-800">{selected.name}</p>
              <button onClick={() => setSelected(null)} className="text-sm font-bold text-ocean-600">
                Ce n&apos;est pas moi
              </button>
            </div>
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-600">
            Ton pseudo pour la semaine (optionnel)
            <input
              className="input mt-1"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={selected.name}
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

          {error && <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>}

          <button onClick={confirm} disabled={saving} className="btn-primary mt-5 w-full">
            {saving ? "Un instant…" : "C'est parti ! 🏄"}
          </button>
        </div>
      )}
    </main>
  );
}
