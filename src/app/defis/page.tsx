"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useDares, useDareVotes, useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/upload";
import { Avatar, EmptyState, PageHeader, Sheet, Spinner } from "@/components/ui";
import DareDetailSheet, { DARE_STATUS_LABELS } from "@/components/DareDetailSheet";
import { displayName } from "@/lib/types";
import type { Dare, Participant } from "@/lib/types";

export default function DefisPage() {
  const { session, ready } = useSession();
  const { data: dares, mutate: mutateDares } = useDares();
  const { data: votes, mutate: mutateVotes } = useDareVotes();
  const { data: participants } = useParticipants();

  const [newOpen, setNewOpen] = useState(false);
  const [proofDare, setProofDare] = useState<Dare | null>(null);
  const [detailDare, setDetailDare] = useState<Dare | null>(null);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);

  if (!ready || !session) return <Spinner />;
  if (!dares || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const forMe = dares.filter((d) => d.target_id === myId && (d.status === "proposed" || d.status === "accepted"));
  const myVoted = new Set((votes ?? []).filter((v) => v.voter_id === myId).map((v) => v.dare_id));
  const toReview = visitor
    ? []
    : dares.filter((d) => d.status === "proof_submitted" && d.target_id !== myId && !myVoted.has(d.id));
  const others = dares.filter((d) => !forMe.includes(d) && !toReview.includes(d));

  async function respond(d: Dare, accept: boolean) {
    const { error } = await supabase
      .from("dares")
      .update({ status: accept ? "accepted" : "refused" })
      .eq("id", d.id);
    if (error) alert(error.message);
    mutateDares();
  }

  async function vote(d: Dare, approve: boolean) {
    const { error } = await supabase.rpc("vote_dare", { p_dare: d.id, p_voter: myId, p_approve: approve });
    if (error) alert(error.message);
    mutateVotes();
    mutateDares();
  }

  function DareCard({ d, children }: { d: Dare; children?: React.ReactNode }) {
    const challenger = byId.get(d.challenger_id);
    const target = byId.get(d.target_id);
    return (
      <div className="card">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <Avatar participant={challenger ?? null} size="sm" />
          <span>{challenger ? displayName(challenger) : "?"} défie {target ? displayName(target) : "?"}</span>
          <Avatar participant={target ?? null} size="sm" />
          <span className="ml-auto font-black text-ocean-700">{d.points} pts</span>
        </div>
        <button onClick={() => setDetailDare(d)} className="mt-2 block w-full text-left">
          <h3 className="font-black text-slate-800">{d.title} <span className="text-xs font-bold text-slate-300">ℹ️</span></h3>
          {d.description && <p className="mt-1 text-sm text-slate-500">{d.description}</p>}
        </button>
        {d.proof_text && <p className="mt-2 text-sm text-slate-600">💬 {d.proof_text}</p>}
        {d.proof_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.proof_photo_url} alt="Preuve" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
        )}
        {children ?? <p className="mt-2 text-sm font-bold text-slate-400">{DARE_STATUS_LABELS[d.status]}</p>}
      </div>
    );
  }

  return (
    <main>
      <PageHeader emoji="🔥" title="Défis" subtitle="Défie qui tu veux. 25 points à la clé." />

      {forMe.length > 0 && (
        <section className="mx-4 mb-4 space-y-2">
          <h2 className="font-black text-rose-700">🎯 Pour toi</h2>
          {forMe.map((d) => (
            <DareCard key={d.id} d={d}>
              {d.status === "proposed" ? (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => respond(d, true)} className="btn-primary flex-1 !bg-emerald-600 !shadow-emerald-600/20">
                    💪 Chiche
                  </button>
                  <button onClick={() => respond(d, false)} className="btn-ghost flex-1 !bg-rose-100 !text-rose-700">
                    🙅 Pas chiche
                  </button>
                </div>
              ) : (
                <button onClick={() => setProofDare(d)} className="btn-primary mt-3 w-full">
                  ✅ Je l&apos;ai fait — envoyer la preuve
                </button>
              )}
            </DareCard>
          ))}
        </section>
      )}

      {toReview.length > 0 && (
        <section className="mx-4 mb-4 space-y-2">
          <h2 className="font-black text-amber-700">🗳️ À valider ({toReview.length})</h2>
          {toReview.map((d) => (
            <DareCard key={d.id} d={d}>
              <div className="mt-3 flex gap-2">
                <button onClick={() => vote(d, true)} className="btn-primary flex-1 !bg-emerald-600 !shadow-emerald-600/20">
                  👍 Validé
                </button>
                <button onClick={() => vote(d, false)} className="btn-ghost flex-1 !bg-rose-100 !text-rose-700">
                  👎 Pas convaincu
                </button>
              </div>
            </DareCard>
          ))}
        </section>
      )}

      {!visitor && (
        <div className="mx-4 mb-3">
          <button onClick={() => setNewOpen(true)} className="btn-primary w-full">
            🔥 Lancer un défi
          </button>
        </div>
      )}

      <section className="mx-4 space-y-3">
        {others.length === 0 && forMe.length === 0 && toReview.length === 0 && (
          <EmptyState emoji="😴" text="Aucun défi lancé pour l'instant. Sois le premier !" />
        )}
        {others.map((d) => (
          <DareCard key={d.id} d={d} />
        ))}
      </section>


      <NewDareSheet
        open={newOpen}
        myId={myId}
        participants={participants}
        onClose={() => setNewOpen(false)}
        onDone={() => {
          setNewOpen(false);
          mutateDares();
        }}
      />
      <DareDetailSheet
        dare={detailDare}
        votes={votes ?? []}
        byId={byId}
        myId={myId}
        readOnly={visitor}
        onVote={vote}
        onClose={() => setDetailDare(null)}
      />

      <DareProofSheet
        dare={proofDare}
        onClose={() => setProofDare(null)}
        onDone={() => {
          setProofDare(null);
          mutateDares();
        }}
      />
    </main>
  );
}

function NewDareSheet({
  open,
  myId,
  participants,
  onClose,
  onDone,
}: {
  open: boolean;
  myId: string;
  participants: Participant[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!target) {
      setError("Choisis ta victime 😈");
      return;
    }
    if (title.trim().length < 3) {
      setError("Décris le défi !");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.from("dares").insert({
      challenger_id: myId,
      target_id: target,
      title: title.trim(),
      description: description.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTarget(null);
    setTitle("");
    setDescription("");
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Lancer un défi 🔥">
      <p className="text-sm font-bold text-slate-600">Qui défies-tu ?</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {participants
          .filter((p) => p.id !== myId)
          .map((p) => (
            <button
              key={p.id}
              onClick={() => setTarget(p.id)}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 transition ${
                target === p.id ? "bg-ocean-200" : "active:bg-ocean-50"
              }`}
            >
              <Avatar participant={p} size="sm" />
              <span className="text-[11px] font-bold text-slate-600">{displayName(p)}</span>
            </button>
          ))}
      </div>
      <input
        className="input mt-3"
        placeholder="Je te défie de…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        className="input mt-3 min-h-20"
        placeholder="Précisions (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={300}
      />
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Envoi…" : "Défier 😈"}
      </button>
    </Sheet>
  );
}

function DareProofSheet({
  dare,
  onClose,
  onDone,
}: {
  dare: Dare | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!dare) return;
    if (!text.trim() && !file) {
      setError("Un mot ou une photo pour convaincre le jury 😄");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let photoUrl: string | null = null;
      if (file) photoUrl = await uploadPhoto(file, "defis");
      const { error } = await supabase
        .from("dares")
        .update({
          status: "proof_submitted",
          proof_text: text.trim() || null,
          proof_photo_url: photoUrl,
        })
        .eq("id", dare.id);
      if (error) throw new Error(error.message);
      setText("");
      setFile(null);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!dare} onClose={onClose} title={`Preuve — ${dare?.title ?? ""}`}>
      <textarea
        className="input mt-1 min-h-24"
        placeholder="Raconte comment tu as relevé le défi…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={400}
      />
      <label className="btn-ghost mt-3 w-full cursor-pointer">
        📷 {file ? file.name.slice(0, 30) : "Ajouter une photo (optionnel)"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Envoi…" : "Envoyer la preuve 🚀"}
      </button>
    </Sheet>
  );
}
