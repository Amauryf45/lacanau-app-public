"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useCompletions, useCompletionVotes, useDailyCompletions, useParticipants, useQuests } from "@/lib/hooks";
import { toISODate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { uploadPhoto } from "@/lib/upload";
import { Avatar, EmptyState, PageHeader, Sheet, Spinner } from "@/components/ui";
import QuestDetailSheet from "@/components/QuestDetailSheet";
import { DAILY_QUEST_POINTS, LEVEL_COLORS, LEVEL_LABELS, VLOG_DRIVE_URL, displayName } from "@/lib/types";
import type { Completion, Quest, QuestLevel } from "@/lib/types";

const FILTERS: { key: QuestLevel | "tout"; label: string }[] = [
  { key: "tout", label: "Tout" },
  { key: "soft", label: "🌱 Soft" },
  { key: "fun", label: "🤪 Fun" },
  { key: "epice", label: "🌶️ Épicé" },
  { key: "perso", label: "✨ Perso" },
];

export default function QuetesPage() {
  const { session, ready } = useSession();
  const { data: quests, mutate: mutateQuests } = useQuests();
  const { data: completions, mutate: mutateCompletions } = useCompletions();
  const { data: votes, mutate: mutateVotes } = useCompletionVotes();
  const { data: participants } = useParticipants();

  const [filter, setFilter] = useState<QuestLevel | "tout">("tout");
  const [proofQuest, setProofQuest] = useState<Quest | null>(null);
  const [detailQuest, setDetailQuest] = useState<Quest | null>(null);
  const [newQuestOpen, setNewQuestOpen] = useState(false);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);
  const questById = useMemo(() => new Map((quests ?? []).map((qu) => [qu.id, qu])), [quests]);

  if (!ready || !session) return <Spinner />;
  if (!quests || !completions || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const myVoted = new Set((votes ?? []).filter((v) => v.voter_id === myId).map((v) => v.completion_id));
  const toReview = visitor
    ? []
    : completions.filter(
        (c) => c.status === "pending" && c.participant_id !== myId && !myVoted.has(c.id) && questById.has(c.quest_id)
      );

  const visibleQuests = quests.filter((qu) => filter === "tout" || qu.level === filter);

  async function vote(c: Completion, approve: boolean) {
    const { error } = await supabase.rpc("vote_completion", {
      p_completion: c.id,
      p_voter: myId,
      p_approve: approve,
    });
    if (error) alert(error.message);
    mutateVotes();
    mutateCompletions();
  }

  return (
    <main>
      <PageHeader emoji="🎯" title="Quêtes" subtitle="Fais-les, prouve-les, empoche les points." />

      <DailyQuestCard myId={myId} readOnly={visitor} />

      {toReview.length > 0 && (
        <section className="mx-4 mb-4 space-y-2">
          <h2 className="font-black text-amber-700">🗳️ À valider ({toReview.length})</h2>
          {toReview.map((c) => {
            const author = byId.get(c.participant_id);
            const quest = questById.get(c.quest_id);
            return (
              <div key={c.id} className="card !border-amber-200">
                <div className="flex items-center gap-2">
                  <Avatar participant={author ?? null} size="sm" />
                  <p className="text-sm font-bold text-slate-700">
                    {author ? displayName(author) : "?"} dit avoir fait{" "}
                    <span className="text-ocean-700">« {quest?.title} »</span>
                  </p>
                </div>
                {c.proof_text && <p className="mt-2 text-sm text-slate-600">💬 {c.proof_text}</p>}
                {c.proof_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.proof_photo_url} alt="Preuve" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => vote(c, true)} className="btn-primary flex-1 !bg-emerald-600 !shadow-emerald-600/20">
                    👍 Validé
                  </button>
                  <button onClick={() => vote(c, false)} className="btn-ghost flex-1 !bg-rose-100 !text-rose-700">
                    👎 Pas convaincu
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="no-scrollbar mx-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip shrink-0 transition ${
              filter === f.key ? "bg-ocean-600 text-white" : "bg-white text-slate-500 border border-ocean-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!visitor && (
        <div className="mx-4 mt-3">
          <button onClick={() => setNewQuestOpen(true)} className="btn-primary w-full">
            ✨ Proposer une quête
          </button>
        </div>
      )}

      <section className="mx-4 mt-3 space-y-3">
        {visibleQuests.length === 0 && <EmptyState emoji="🦗" text="Aucune quête ici pour l'instant." />}
        {visibleQuests.map((quest) => {
          const questCompletions = completions.filter((c) => c.quest_id === quest.id);
          const validated = questCompletions.filter((c) => c.status === "validated");
          const pendingProofs = questCompletions.filter((c) => c.status === "pending");
          const mine = questCompletions.find((c) => c.participant_id === myId);
          const creator = quest.created_by ? byId.get(quest.created_by) : null;
          return (
            <div key={quest.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setDetailQuest(quest)} className="min-w-0 flex-1 text-left">
                  <h3 className="font-black text-slate-800">{quest.title} <span className="text-xs font-bold text-slate-300">ℹ️</span></h3>
                  {quest.description && <p className="mt-1 text-sm text-slate-500">{quest.description}</p>}
                  {creator && (
                    <p className="mt-1 text-xs font-bold text-violet-500">
                      proposée par {displayName(creator)}
                    </p>
                  )}
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`chip !px-2 !py-0.5 !text-xs ${LEVEL_COLORS[quest.level]}`}>
                    {LEVEL_LABELS[quest.level]}
                  </span>
                  <span className="text-sm font-black text-ocean-700">{quest.points} pts</span>
                </div>
              </div>

              {validated.length > 0 && (
                <button onClick={() => setDetailQuest(quest)} className="mt-2 flex items-center gap-1">
                  {validated.slice(0, 8).map((c) => (
                    <Avatar key={c.id} participant={byId.get(c.participant_id) ?? null} size="sm" />
                  ))}
                  <span className="ml-1 text-xs font-bold text-slate-400">
                    l&apos;{validated.length > 1 ? "ont" : "a"} faite ✅
                  </span>
                </button>
              )}
              {pendingProofs.length > 0 && (
                <button onClick={() => setDetailQuest(quest)} className="mt-1.5 flex items-center gap-1">
                  {pendingProofs.slice(0, 8).map((c) => (
                    <Avatar key={c.id} participant={byId.get(c.participant_id) ?? null} size="sm" />
                  ))}
                  <span className="ml-1 text-xs font-bold text-amber-600">
                    preuve{pendingProofs.length > 1 ? "s" : ""} en attente de votes ⏳
                  </span>
                </button>
              )}

              <div className="mt-3">
                {!mine && !visitor && (
                  <button onClick={() => setProofQuest(quest)} className="btn-ghost w-full">
                    Je l&apos;ai faite ! 🙋
                  </button>
                )}
                {mine?.status === "pending" && (
                  <p className="text-center text-sm font-bold text-amber-600">⏳ En attente des votes…</p>
                )}
                {mine?.status === "validated" && (
                  <p className="text-center text-sm font-bold text-emerald-600">✅ Validée, {quest.points} pts !</p>
                )}
                {mine?.status === "rejected" && (
                  <p className="text-center text-sm font-bold text-rose-500">❌ Refusée… retente ta chance ?</p>
                )}
              </div>
            </div>
          );
        })}
      </section>


      <ProofSheet
        quest={proofQuest}
        myId={myId}
        onClose={() => setProofQuest(null)}
        onDone={() => {
          setProofQuest(null);
          mutateCompletions();
        }}
      />
      <QuestDetailSheet
        quest={detailQuest}
        completions={completions.filter((c) => c.quest_id === detailQuest?.id)}
        votes={votes ?? []}
        byId={byId}
        myId={myId}
        readOnly={visitor}
        onVote={vote}
        onClose={() => setDetailQuest(null)}
      />

      <NewQuestSheet
        open={newQuestOpen}
        myId={myId}
        onClose={() => setNewQuestOpen(false)}
        onDone={() => {
          setNewQuestOpen(false);
          mutateQuests();
        }}
      />
    </main>
  );
}

function DailyQuestCard({ myId, readOnly = false }: { myId: string; readOnly?: boolean }) {
  const { data: dailies, mutate } = useDailyCompletions();
  const today = toISODate(new Date());
  const mine = (dailies ?? []).find((d) => d.participant_id === myId && d.day === today);
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    const { error } = await supabase.from("daily_completions").insert({ participant_id: myId, day: today });
    setBusy(false);
    if (error) alert(error.message);
    mutate();
  }

  return (
    <section className="mx-4 mb-4">
      <div className="card !border-sunset-400/40 !bg-gradient-to-r !from-amber-50 !to-orange-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-black text-slate-800">📹 Quête du jour</h2>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Ajoute une vidéo au drive pour le vlog de la semaine.
            </p>
          </div>
          <span className="chip shrink-0 !bg-orange-100 !text-orange-700 !text-xs">
            +{DAILY_QUEST_POINTS} pts/jour
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <a href={VLOG_DRIVE_URL} target="_blank" rel="noreferrer" className="btn-ghost flex-1 !py-2 text-sm">
            📁 Ouvrir le Drive
          </a>
          {!mine && !readOnly && (
            <button onClick={claim} disabled={busy} className="btn-primary flex-1 !bg-sunset-500 !py-2 !shadow-sunset-500/20 text-sm">
              {busy ? "…" : "🎬 Vidéo ajoutée !"}
            </button>
          )}
        </div>
        {mine?.status === "pending" && (
          <p className="mt-2 text-center text-sm font-bold text-amber-600">
            ⏳ En attente de validation par l&apos;orga
          </p>
        )}
        {mine?.status === "validated" && (
          <p className="mt-2 text-center text-sm font-bold text-emerald-600">
            ✅ Validée — +{DAILY_QUEST_POINTS} pts ! À demain 🎥
          </p>
        )}
        {mine?.status === "rejected" && (
          <p className="mt-2 text-center text-sm font-bold text-rose-500">
            ❌ Refusée par l&apos;orga… on en reparle demain
          </p>
        )}
      </div>
    </section>
  );
}

function ProofSheet({
  quest,
  myId,
  onClose,
  onDone,
}: {
  quest: Quest | null;
  myId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!quest) return;
    if (!text.trim() && !file) {
      setError("Raconte au moins ce qui s'est passé, ou mets une photo 😄");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let photoUrl: string | null = null;
      if (file) photoUrl = await uploadPhoto(file, "preuves");
      const { error } = await supabase.from("completions").insert({
        quest_id: quest.id,
        participant_id: myId,
        proof_text: text.trim() || null,
        proof_photo_url: photoUrl,
      });
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
    <Sheet open={!!quest} onClose={onClose} title={`Preuve — ${quest?.title ?? ""}`}>
      <p className="text-sm font-semibold text-slate-500">
        Les autres voteront pour valider. Sois convaincant·e 😏
      </p>
      <textarea
        className="input mt-3 min-h-24"
        placeholder="Raconte… (où, quand, comment)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={400}
      />
      <label className="btn-ghost mt-3 w-full cursor-pointer">
        📷 {file ? file.name.slice(0, 30) : "Ajouter une photo (optionnel)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Envoi…" : "Envoyer la preuve 🚀"}
      </button>
    </Sheet>
  );
}

function NewQuestSheet({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (title.trim().length < 3) {
      setError("Un titre un peu plus parlant ? 😄");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.from("quests").insert({
      title: title.trim(),
      description: description.trim() || null,
      level: "perso",
      points: 25,
      created_by: myId,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setDescription("");
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Proposer une quête ✨">
      <p className="text-sm font-semibold text-slate-500">
        Elle vaudra 25 points pour tous ceux qui la relèvent.
      </p>
      <input
        className="input mt-3"
        placeholder="Titre de la quête"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        className="input mt-3 min-h-20"
        placeholder="Les règles du jeu (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={300}
      />
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Création…" : "Lancer la quête 🎯"}
      </button>
    </Sheet>
  );
}
