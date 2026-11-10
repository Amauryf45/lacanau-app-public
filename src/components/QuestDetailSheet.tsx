"use client";

import { Avatar, Sheet } from "@/components/ui";
import { LEVEL_COLORS, LEVEL_LABELS, displayName } from "@/lib/types";
import type { Completion, CompletionVote, Participant, Quest } from "@/lib/types";

const STATUS: Record<Completion["status"], string> = {
  pending: "⏳ en attente des votes",
  validated: "✅ validée",
  rejected: "❌ refusée",
};

export default function QuestDetailSheet({
  quest,
  completions,
  votes,
  byId,
  myId,
  readOnly = false,
  onVote,
  onClose,
}: {
  quest: Quest | null;
  completions: Completion[];
  votes: CompletionVote[];
  byId: Map<string, Participant>;
  myId: string;
  readOnly?: boolean;
  onVote: (c: Completion, approve: boolean) => void;
  onClose: () => void;
}) {
  if (!quest) return null;
  const creator = quest.created_by ? byId.get(quest.created_by) : null;

  return (
    <Sheet open onClose={onClose} title={quest.title}>
      <div className="flex items-center gap-2">
        <span className={`chip !px-2 !py-0.5 !text-xs ${LEVEL_COLORS[quest.level]}`}>
          {LEVEL_LABELS[quest.level]}
        </span>
        <span className="text-sm font-black text-ocean-700">{quest.points} pts</span>
      </div>
      {quest.description && <p className="mt-2 text-sm text-slate-600">{quest.description}</p>}
      <p className="mt-1 text-xs font-bold text-violet-500">
        {creator ? `Proposée par ${displayName(creator)}` : "Quête de base de la semaine"}
      </p>

      <h3 className="mt-4 font-black text-slate-700">
        Tentatives ({completions.length})
      </h3>
      {completions.length === 0 && (
        <p className="mt-1 text-sm font-semibold text-slate-400">
          Personne ne s&apos;est encore lancé. L&apos;occasion de marquer l&apos;histoire ?
        </p>
      )}
      <div className="mt-2 space-y-3">
        {completions.map((c) => {
          const author = byId.get(c.participant_id);
          const cVotes = votes.filter((v) => v.completion_id === c.id);
          const yes = cVotes.filter((v) => v.approve);
          const no = cVotes.filter((v) => !v.approve);
          const canVote =
            !readOnly && c.status === "pending" && c.participant_id !== myId && !cVotes.some((v) => v.voter_id === myId);
          return (
            <div key={c.id} className="rounded-xl border border-ocean-100 bg-ocean-50/40 p-3">
              <div className="flex items-center gap-2">
                <Avatar participant={author ?? null} size="sm" />
                <span className="font-bold text-slate-700">{author ? displayName(author) : "?"}</span>
                <span className="ml-auto text-xs font-bold text-slate-500">{STATUS[c.status]}</span>
              </div>
              {c.proof_text && <p className="mt-2 text-sm text-slate-600">💬 {c.proof_text}</p>}
              {c.proof_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.proof_photo_url} alt="Preuve" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
              )}
              {(yes.length > 0 || no.length > 0) && (
                <div className="mt-2 space-y-1 text-xs font-bold">
                  {yes.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1 text-emerald-700">
                      👍
                      {yes.map((v) => (
                        <Avatar key={v.id} participant={byId.get(v.voter_id) ?? null} size="sm" />
                      ))}
                      <span>{yes.map((v) => displayName(byId.get(v.voter_id) ?? { name: "?", nickname: null })).join(", ")}</span>
                    </p>
                  )}
                  {no.length > 0 && (
                    <p className="flex flex-wrap items-center gap-1 text-rose-600">
                      👎
                      {no.map((v) => (
                        <Avatar key={v.id} participant={byId.get(v.voter_id) ?? null} size="sm" />
                      ))}
                      <span>{no.map((v) => displayName(byId.get(v.voter_id) ?? { name: "?", nickname: null })).join(", ")}</span>
                    </p>
                  )}
                </div>
              )}
              {canVote && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onVote(c, true)} className="btn-primary flex-1 !bg-emerald-600 !py-2 !shadow-emerald-600/20 text-sm">
                    👍 Validé
                  </button>
                  <button onClick={() => onVote(c, false)} className="btn-ghost flex-1 !bg-rose-100 !py-2 !text-rose-700 text-sm">
                    👎 Pas convaincu
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
