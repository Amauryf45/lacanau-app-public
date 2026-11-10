"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useParticipants, usePollOptions, usePolls, usePollVotes } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { EmptyState, PageHeader, Sheet, Spinner } from "@/components/ui";
import { displayName } from "@/lib/types";
import type { Participant, Poll, PollOption, PollVote } from "@/lib/types";

export default function SondagesPage() {
  const { session, ready } = useSession();
  const { data: polls, mutate: mutatePolls } = usePolls();
  const { data: options, mutate: mutateOptions } = usePollOptions();
  const { data: votes, mutate: mutateVotes } = usePollVotes();
  const { data: participants } = useParticipants();

  const [newOpen, setNewOpen] = useState(false);
  const [answerPoll, setAnswerPoll] = useState<Poll | null>(null);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);

  if (!ready || !session) return <Spinner />;
  if (!polls || !options || !votes || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);

  async function voteFor(poll: Poll, optionId: string) {
    if (poll.closed || visitor) return;
    const { error } = await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: poll.id, option_id: optionId, voter_id: myId },
        { onConflict: "poll_id,voter_id" }
      );
    if (error) alert(error.message);
    mutateVotes();
  }

  async function closePoll(poll: Poll) {
    const { error } = await supabase.from("polls").update({ closed: true }).eq("id", poll.id);
    if (error) alert(error.message);
    mutatePolls();
  }

  return (
    <main>
      <PageHeader emoji="🗳️" title="Sondages" subtitle="La démocratie version plage." />

      {!visitor && (
        <div className="mx-4 mb-4">
          <button onClick={() => setNewOpen(true)} className="btn-primary w-full">
            ➕ Créer un sondage
          </button>
        </div>
      )}

      <section className="mx-4 space-y-3">
        {polls.length === 0 && <EmptyState emoji="🤷" text="Aucun sondage. Qui est le plus susceptible d'en créer un ?" />}
        {polls.map((poll) => {
          const pollOptions = options.filter((o) => o.poll_id === poll.id);
          const pollVotes = votes.filter((v) => v.poll_id === poll.id);
          const myVote = pollVotes.find((v) => v.voter_id === myId);
          const creator = byId.get(poll.created_by);
          const total = pollVotes.length;
          const compact = pollOptions.length > 2;
          const leader = compact
            ? [...pollOptions].sort(
                (a, b) =>
                  pollVotes.filter((v) => v.option_id === b.id).length -
                  pollVotes.filter((v) => v.option_id === a.id).length
              )[0]
            : null;
          const leaderCount = leader ? pollVotes.filter((v) => v.option_id === leader.id).length : 0;
          const myOption = myVote ? pollOptions.find((o) => o.id === myVote.option_id) : null;
          return (
            <div key={poll.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black text-slate-800">{poll.question}</h3>
                {poll.closed && <span className="chip !bg-slate-100 !text-slate-500 !text-xs shrink-0">Clos</span>}
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-400">
                par {creator ? displayName(creator) : "?"} · {total} vote{total > 1 ? "s" : ""}
              </p>

              {compact ? (
                <>
                  <div className="mt-2 space-y-0.5 text-sm font-bold">
                    {leaderCount > 0 && leader && (
                      <p className="text-slate-600">
                        🥇 En tête : {leader.label} ({Math.round((leaderCount / total) * 100)}%)
                      </p>
                    )}
                    <p className={myOption ? "text-emerald-600" : "text-amber-600"}>
                      {myOption ? `✓ Tu as voté : ${myOption.label}` : poll.closed ? "" : "⏳ Tu n'as pas encore voté"}
                    </p>
                  </div>
                  <button onClick={() => setAnswerPoll(poll)} className="btn-ghost mt-3 w-full">
                    {poll.closed ? "📊 Voir les résultats" : myOption ? "📊 Résultats / changer mon vote" : "🗳️ Répondre"}
                  </button>
                </>
              ) : (
                <div className="mt-3">
                  <PollOptionsList
                    poll={poll}
                    options={pollOptions}
                    votes={pollVotes}
                    myVoteOptionId={myVote?.option_id ?? null}
                    onVote={(optionId) => voteFor(poll, optionId)}
                  />
                </div>
              )}

              {!poll.closed && poll.created_by === myId && (
                <button onClick={() => closePoll(poll)} className="mt-3 text-sm font-bold text-slate-400">
                  🔒 Clore le sondage
                </button>
              )}
            </div>
          );
        })}
      </section>

      <Sheet
        open={!!answerPoll}
        onClose={() => setAnswerPoll(null)}
        title={answerPoll?.question ?? ""}
      >
        {answerPoll && (
          <PollOptionsList
            poll={answerPoll}
            options={options.filter((o) => o.poll_id === answerPoll.id)}
            votes={votes.filter((v) => v.poll_id === answerPoll.id)}
            myVoteOptionId={votes.find((v) => v.poll_id === answerPoll.id && v.voter_id === myId)?.option_id ?? null}
            onVote={(optionId) => voteFor(answerPoll, optionId)}
          />
        )}
      </Sheet>

      <NewPollSheet
        open={newOpen}
        myId={myId}
        participants={participants}
        onClose={() => setNewOpen(false)}
        onDone={() => {
          setNewOpen(false);
          mutatePolls();
          mutateOptions();
        }}
      />
    </main>
  );
}

function PollOptionsList({
  poll,
  options,
  votes,
  myVoteOptionId,
  onVote,
}: {
  poll: Poll;
  options: PollOption[];
  votes: PollVote[];
  myVoteOptionId: string | null;
  onVote: (optionId: string) => void;
}) {
  const total = votes.length;
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const count = votes.filter((v) => v.option_id === option.id).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const isMine = myVoteOptionId === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onVote(option.id)}
            disabled={poll.closed}
            className={`relative block w-full overflow-hidden rounded-xl border p-0 text-left transition active:scale-[0.99] ${
              isMine ? "border-ocean-500" : "border-ocean-100"
            }`}
          >
            <span
              className={`absolute inset-y-0 left-0 ${isMine ? "bg-ocean-200" : "bg-ocean-100/70"}`}
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex items-center justify-between px-3 py-2.5">
              <span className="font-bold text-slate-700">
                {isMine && "✓ "}
                {option.label}
              </span>
              <span className="text-sm font-black text-ocean-700">{pct}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NewPollSheet({
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
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setOption(i: number, value: string) {
    setOptionsText((prev) => prev.map((o, j) => (j === i ? value : o)));
  }

  function fillParticipants() {
    setOptionsText(participants.map((p) => displayName(p)));
  }

  async function submit() {
    const cleaned = optionsText.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) {
      setError("Pose une vraie question 😄");
      return;
    }
    if (cleaned.length < 2) {
      setError("Il faut au moins 2 options.");
      return;
    }
    setBusy(true);
    setError("");
    const { data: poll, error } = await supabase
      .from("polls")
      .insert({ question: question.trim(), created_by: myId })
      .select()
      .single();
    if (error || !poll) {
      setBusy(false);
      setError(error?.message ?? "Erreur");
      return;
    }
    const { error: optErr } = await supabase
      .from("poll_options")
      .insert(cleaned.map((label, position) => ({ poll_id: poll.id, label, position })));
    setBusy(false);
    if (optErr) {
      setError(optErr.message);
      return;
    }
    setQuestion("");
    setOptionsText(["", ""]);
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouveau sondage 🗳️">
      <input
        className="input"
        placeholder="Ta question (ex : qui est le plus susceptible de…)"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={140}
      />
      <div className="mt-3 space-y-2">
        {optionsText.map((option, i) => (
          <input
            key={i}
            className="input"
            placeholder={`Option ${i + 1}`}
            value={option}
            onChange={(e) => setOption(i, e.target.value)}
            maxLength={60}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => setOptionsText((prev) => [...prev, ""])} className="btn-ghost flex-1 !py-2 text-sm">
          ➕ Option
        </button>
        <button onClick={fillParticipants} className="btn-ghost flex-1 !py-2 text-sm">
          👥 Les 13 prénoms
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Création…" : "Lancer le vote 🗳️"}
      </button>
    </Sheet>
  );
}
