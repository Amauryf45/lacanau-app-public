"use client";

import { Avatar, Sheet } from "@/components/ui";
import { displayName } from "@/lib/types";
import type { Dare, DareStatus, DareVote, Participant } from "@/lib/types";

export const DARE_STATUS_LABELS: Record<DareStatus, string> = {
  proposed: "⏳ En attente de réponse",
  accepted: "💪 Accepté, en cours",
  refused: "🙅 Refusé",
  proof_submitted: "🗳️ Preuve en cours de validation",
  validated: "✅ Réussi",
  rejected: "❌ Preuve refusée",
};

export default function DareDetailSheet({
  dare,
  votes,
  byId,
  myId,
  readOnly = false,
  onVote,
  onClose,
}: {
  dare: Dare | null;
  votes: DareVote[];
  byId: Map<string, Participant>;
  myId: string;
  readOnly?: boolean;
  onVote: (d: Dare, approve: boolean) => void;
  onClose: () => void;
}) {
  if (!dare) return null;
  const challenger = byId.get(dare.challenger_id);
  const target = byId.get(dare.target_id);
  const dVotes = votes.filter((v) => v.dare_id === dare.id);
  const yes = dVotes.filter((v) => v.approve);
  const no = dVotes.filter((v) => !v.approve);
  const canVote =
    !readOnly && dare.status === "proof_submitted" && dare.target_id !== myId && !dVotes.some((v) => v.voter_id === myId);
  const name = (id: string) => displayName(byId.get(id) ?? { name: "?", nickname: null });

  return (
    <Sheet open onClose={onClose} title={dare.title}>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <Avatar participant={challenger ?? null} size="sm" />
        <span>{challenger ? displayName(challenger) : "?"} défie {target ? displayName(target) : "?"}</span>
        <Avatar participant={target ?? null} size="sm" />
        <span className="ml-auto font-black text-ocean-700">{dare.points} pts</span>
      </div>
      {dare.description && <p className="mt-2 text-sm text-slate-600">{dare.description}</p>}
      <p className="mt-2 text-sm font-bold text-slate-500">{DARE_STATUS_LABELS[dare.status]}</p>

      {(dare.proof_text || dare.proof_photo_url) && (
        <div className="mt-3 rounded-xl border border-ocean-100 bg-ocean-50/40 p-3">
          <p className="text-xs font-black text-slate-500">
            Preuve de {target ? displayName(target) : "?"}
          </p>
          {dare.proof_text && <p className="mt-1 text-sm text-slate-600">💬 {dare.proof_text}</p>}
          {dare.proof_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dare.proof_photo_url} alt="Preuve" className="mt-2 max-h-64 w-full rounded-xl object-cover" />
          )}
        </div>
      )}

      {(yes.length > 0 || no.length > 0) && (
        <div className="mt-3 space-y-1 text-xs font-bold">
          {yes.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-emerald-700">
              👍
              {yes.map((v) => (
                <Avatar key={v.id} participant={byId.get(v.voter_id) ?? null} size="sm" />
              ))}
              <span>{yes.map((v) => name(v.voter_id)).join(", ")}</span>
            </p>
          )}
          {no.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-rose-600">
              👎
              {no.map((v) => (
                <Avatar key={v.id} participant={byId.get(v.voter_id) ?? null} size="sm" />
              ))}
              <span>{no.map((v) => name(v.voter_id)).join(", ")}</span>
            </p>
          )}
        </div>
      )}

      {canVote && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => onVote(dare, true)} className="btn-primary flex-1 !bg-emerald-600 !shadow-emerald-600/20">
            👍 Validé
          </button>
          <button onClick={() => onVote(dare, false)} className="btn-ghost flex-1 !bg-rose-100 !text-rose-700">
            👎 Pas convaincu
          </button>
        </div>
      )}
    </Sheet>
  );
}
