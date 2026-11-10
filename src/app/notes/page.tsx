"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useNoteReactions, useNotes, useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { EmptyState, PageHeader, Sheet, Spinner } from "@/components/ui";
import { formatRelative } from "@/lib/dates";
import type { PublicNote } from "@/lib/types";

const REACTIONS = ["😂", "😱", "❤️", "👀", "💀"];

export default function NotesPage() {
  const { session, ready } = useSession();
  const { data: notes, mutate: mutateNotes } = useNotes();
  const { data: reactions, mutate: mutateReactions } = useNoteReactions();
  const { data: participants, mutate: mutateParticipants } = useParticipants();

  const [composeOpen, setComposeOpen] = useState(false);
  const [revealTarget, setRevealTarget] = useState<PublicNote | null>(null);

  const reactionsByNote = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of reactions ?? []) {
      if (!map.has(r.note_id)) map.set(r.note_id, new Map());
      const inner = map.get(r.note_id)!;
      inner.set(r.emoji, (inner.get(r.emoji) ?? 0) + 1);
    }
    return map;
  }, [reactions]);

  if (!ready || !session) return <Spinner />;
  if (!notes || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const me = participants.find((p) => p.id === myId);
  const jokerAvailable = me ? !me.joker_used : false;
  const myReactions = new Set(
    (reactions ?? []).filter((r) => r.participant_id === myId).map((r) => `${r.note_id}:${r.emoji}`)
  );

  async function toggleReaction(note: PublicNote, emoji: string) {
    if (visitor) return;
    const key = `${note.id}:${emoji}`;
    if (myReactions.has(key)) {
      await supabase.from("note_reactions").delete().match({ note_id: note.id, participant_id: myId, emoji });
    } else {
      await supabase.from("note_reactions").insert({ note_id: note.id, participant_id: myId, emoji });
    }
    mutateReactions();
  }

  async function reveal() {
    if (!revealTarget) return;
    const { error } = await supabase.rpc("reveal_note", { p_note: revealTarget.id, p_revealer: myId });
    if (error) alert(error.message);
    setRevealTarget(null);
    mutateNotes();
    mutateParticipants();
  }

  return (
    <main>
      <PageHeader
        emoji="🎭"
        title="Notes anonymes"
        subtitle={`Potins, déclarations, taquineries. ${jokerAvailable ? "Ton joker 🃏 est dispo." : "Joker déjà grillé 🃏❌"}`}
      />

      {!visitor && (
        <div className="mx-4 mb-4">
          <button onClick={() => setComposeOpen(true)} className="btn-primary w-full">
            ✍️ Écrire une note anonyme
          </button>
        </div>
      )}

      <section className="mx-4 space-y-3">
        {notes.length === 0 && <EmptyState emoji="🤫" text="Aucun potin pour l'instant. Ça ne va pas durer." />}
        {notes.map((note) => {
          const noteReactions = reactionsByNote.get(note.id);
          return (
            <div key={note.id} className="card">
              <p className="text-slate-700 font-semibold whitespace-pre-wrap">{note.content}</p>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{note.revealed ? `🃏 C'était ${note.revealed_author_name} ! (révélé par ${note.revealed_by_name})` : "Anonyme 🎭"}</span>
                <span>{formatRelative(note.created_at)}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {REACTIONS.map((emoji) => {
                  const count = noteReactions?.get(emoji) ?? 0;
                  const mine = myReactions.has(`${note.id}:${emoji}`);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(note, emoji)}
                      className={`rounded-full px-2 py-1 text-sm transition ${
                        mine ? "bg-ocean-200" : count > 0 ? "bg-slate-100" : "opacity-40"
                      }`}
                    >
                      {emoji}
                      {count > 0 && <span className="ml-1 text-xs font-black text-slate-500">{count}</span>}
                    </button>
                  );
                })}
                {!note.revealed && jokerAvailable && (
                  <button
                    onClick={() => setRevealTarget(note)}
                    className="ml-auto rounded-full bg-violet-100 px-2.5 py-1 text-sm font-black text-violet-700"
                  >
                    🃏 Révéler
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <ComposeSheet
        open={composeOpen}
        myId={myId}
        onClose={() => setComposeOpen(false)}
        onDone={() => {
          setComposeOpen(false);
          mutateNotes();
        }}
      />

      <Sheet open={!!revealTarget} onClose={() => setRevealTarget(null)} title="Utiliser ton joker 🃏">
        <p className="font-semibold text-slate-600">
          Tu n&apos;as qu&apos;<span className="font-black">un seul joker</span> pour toute la semaine.
          L&apos;utiliser révélera l&apos;auteur de cette note <span className="font-black">aux yeux de tous</span> —
          et tout le monde saura que c&apos;est toi qui as vendu la mèche.
        </p>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
          « {revealTarget?.content.slice(0, 120)}{(revealTarget?.content.length ?? 0) > 120 ? "…" : ""} »
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setRevealTarget(null)} className="btn-ghost flex-1">
            Finalement non
          </button>
          <button onClick={reveal} className="btn-primary flex-1 !bg-violet-600 !shadow-violet-600/20">
            🃏 Je balance
          </button>
        </div>
      </Sheet>
    </main>
  );
}

function ComposeSheet({
  open,
  myId,
  onClose,
  onDone,
}: {
  open: boolean;
  myId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (content.trim().length < 2) {
      setError("Écris quelque chose 😄");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("post_note", { p_author: myId, p_content: content });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setContent("");
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Note anonyme 🎭">
      <p className="text-sm font-semibold text-slate-500">
        Personne ne saura que c&apos;est toi… sauf si quelqu&apos;un grille son joker 🃏
      </p>
      <textarea
        className="input mt-3 min-h-28"
        placeholder="Ton potin, ta déclaration, ta punchline…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
      />
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Envoi…" : "Poster anonymement 🤫"}
      </button>
    </Sheet>
  );
}
