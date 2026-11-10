"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import {
  useAllQuests,
  useCompletions,
  useCompletionVotes,
  useDares,
  useDareVotes,
  useLeaderboard,
  useParticipants,
} from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Avatar, Name, PageHeader, Sheet, Spinner } from "@/components/ui";
import QuestDetailSheet from "@/components/QuestDetailSheet";
import DareDetailSheet from "@/components/DareDetailSheet";
import { displayName } from "@/lib/types";
import type { Completion, Dare, LeaderboardRow, Quest } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ClassementPage() {
  const { session, ready } = useSession();
  const { data: leaderboard } = useLeaderboard();
  const { data: quests } = useAllQuests();
  const { data: completions, mutate: mutateCompletions } = useCompletions();
  const { data: completionVotes, mutate: mutateCompletionVotes } = useCompletionVotes();
  const { data: dares, mutate: mutateDares } = useDares();
  const { data: dareVotes, mutate: mutateDareVotes } = useDareVotes();
  const { data: participants } = useParticipants();

  const [person, setPerson] = useState<LeaderboardRow | null>(null);
  const [detailQuest, setDetailQuest] = useState<Quest | null>(null);
  const [detailDare, setDetailDare] = useState<Dare | null>(null);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);
  const questById = useMemo(() => new Map((quests ?? []).map((qu) => [qu.id, qu])), [quests]);

  if (!ready || !session) return <Spinner />;
  if (!leaderboard) return <Spinner />;

  const myId = session.participantId;

  async function voteCompletion(c: Completion, approve: boolean) {
    const { error } = await supabase.rpc("vote_completion", {
      p_completion: c.id,
      p_voter: myId,
      p_approve: approve,
    });
    if (error) alert(error.message);
    mutateCompletionVotes();
    mutateCompletions();
  }

  async function voteDare(d: Dare, approve: boolean) {
    const { error } = await supabase.rpc("vote_dare", { p_dare: d.id, p_voter: myId, p_approve: approve });
    if (error) alert(error.message);
    mutateDareVotes();
    mutateDares();
  }

  const personCompletions = person
    ? (completions ?? []).filter((c) => c.participant_id === person.id && c.status === "validated")
    : [];
  const personDares = person
    ? (dares ?? []).filter((d) => d.target_id === person.id && d.status === "validated")
    : [];

  return (
    <main>
      <PageHeader emoji="🏆" title="Classement" subtitle="Quêtes validées + défis réussis. Touche un nom pour le palmarès." />
      <section className="mx-4 space-y-2">
        {leaderboard.map((row, i) => {
          const isMe = row.id === session.participantId;
          return (
            <button
              key={row.id}
              onClick={() => setPerson(row)}
              className={`card flex w-full items-center gap-3 !p-3 text-left active:scale-[0.99] transition ${
                isMe ? "!border-ocean-400 !bg-ocean-50" : ""
              }`}
            >
              <span className="w-8 text-center text-lg font-black text-slate-400">
                {MEDALS[i] ?? i + 1}
              </span>
              <Avatar participant={row} size="sm" />
              <span className="font-bold text-slate-700">
                <Name participant={row} />
                {isMe && " (toi)"}
              </span>
              <span className="ml-auto font-black text-ocean-700">{row.points} pts</span>
            </button>
          );
        })}
      </section>

      <Sheet
        open={!!person}
        onClose={() => setPerson(null)}
        title={person ? `Palmarès de ${displayName(person)} ${person.emoji}` : ""}
      >
        {person && (
          <>
            <p className="text-sm font-bold text-ocean-700">{person.points} points au total</p>
            {personCompletions.length === 0 && personDares.length === 0 && (
              <p className="mt-3 text-sm font-semibold text-slate-400">
                Rien de validé pour l&apos;instant. Ça viendra (ou pas). 🌱
              </p>
            )}
            <div className="mt-3 space-y-2">
              {personCompletions.map((c) => {
                const quest = questById.get(c.quest_id);
                if (!quest) return null;
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetailQuest(quest)}
                    className="flex w-full items-center gap-2 rounded-xl border border-ocean-100 bg-ocean-50/40 p-3 text-left active:scale-[0.99] transition"
                  >
                    <span>🎯</span>
                    <span className="min-w-0 flex-1 truncate font-bold text-slate-700">{quest.title}</span>
                    <span className="shrink-0 font-black text-emerald-600">+{quest.points}</span>
                  </button>
                );
              })}
              {personDares.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDetailDare(d)}
                  className="flex w-full items-center gap-2 rounded-xl border border-ocean-100 bg-ocean-50/40 p-3 text-left active:scale-[0.99] transition"
                >
                  <span>🔥</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-slate-700">{d.title}</span>
                  <span className="shrink-0 font-black text-emerald-600">+{d.points}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>

      <QuestDetailSheet
        quest={detailQuest}
        completions={(completions ?? []).filter((c) => c.quest_id === detailQuest?.id)}
        votes={completionVotes ?? []}
        byId={byId}
        myId={myId}
        readOnly={isVisitor(session)}
        onVote={voteCompletion}
        onClose={() => setDetailQuest(null)}
      />
      <DareDetailSheet
        dare={detailDare}
        votes={dareVotes ?? []}
        byId={byId}
        myId={myId}
        readOnly={isVisitor(session)}
        onVote={voteDare}
        onClose={() => setDetailDare(null)}
      />
    </main>
  );
}
