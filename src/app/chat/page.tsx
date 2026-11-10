"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { useMessageReactions, useMessages, useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Avatar, Name, Spinner } from "@/components/ui";

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const REACTIONS = ["👍", "❤️", "😂", "😱", "🍻"];

export default function ChatPage() {
  const { session, ready } = useSession();
  const { data: messages, mutate } = useMessages();
  const { data: reactions, mutate: mutateReactions } = useMessageReactions();
  const { data: participants } = useParticipants();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);

  const reactionsByMsg = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const r of reactions ?? []) {
      if (!map.has(r.message_id)) map.set(r.message_id, new Map());
      const inner = map.get(r.message_id)!;
      inner.set(r.emoji, (inner.get(r.emoji) ?? 0) + 1);
    }
    return map;
  }, [reactions]);

  useEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: lastCount.current === 0 ? "auto" : "smooth" });
    }
  }, [messages]);

  if (!ready || !session) return <Spinner />;
  if (!messages || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const myReactions = new Set(
    (reactions ?? []).filter((r) => r.participant_id === myId).map((r) => `${r.message_id}:${r.emoji}`)
  );

  async function toggleReaction(messageId: string, emoji: string) {
    setPickerFor(null);
    if (visitor) return;
    if (myReactions.has(`${messageId}:${emoji}`)) {
      await supabase.from("message_reactions").delete().match({ message_id: messageId, participant_id: myId, emoji });
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, participant_id: myId, emoji });
    }
    mutateReactions();
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    // Affichage optimiste, corrigé par la revalidation
    mutate(
      (prev) => [
        ...(prev ?? []),
        { id: `tmp-${Date.now()}`, author_id: myId, content, created_at: new Date().toISOString() },
      ],
      { revalidate: false }
    );
    const { error } = await supabase.from("messages").insert({ author_id: myId, content });
    if (error) alert(error.message);
    await mutate();
    setSending(false);
  }

  return (
    <main className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-800">💬 Chat</h1>
      </header>

      <div className="flex-1 space-y-1 px-4 pb-2">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-slate-400">
            Personne n&apos;a encore rien dit. Lance un sujet 🐚
          </p>
        )}
        {messages.map((m, i) => {
          const author = byId.get(m.author_id);
          const mine = m.author_id === myId;
          const prev = messages[i - 1];
          const newDay = !prev || !isSameDay(prev.created_at, m.created_at);
          const sameAuthorAsPrev = prev && prev.author_id === m.author_id && !newDay;
          return (
            <div key={m.id}>
              {newDay && (
                <p className="py-2 text-center text-xs font-bold text-slate-400">
                  {formatDaySeparator(m.created_at)}
                </p>
              )}
              <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""} ${sameAuthorAsPrev ? "mt-0.5" : "mt-2"}`}>
                {!mine && (
                  <span className="w-7 shrink-0">
                    {!sameAuthorAsPrev && <Avatar participant={author ?? null} size="sm" />}
                  </span>
                )}
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <button
                    onClick={() => !visitor && setPickerFor(pickerFor === m.id ? null : m.id)}
                    className={`rounded-2xl px-3 py-2 text-left ${
                      mine ? "bg-ocean-600 text-white rounded-br-md" : "bg-white border border-ocean-100 rounded-bl-md"
                    }`}
                  >
                    {!mine && !sameAuthorAsPrev && (
                      <p className="text-xs font-black text-ocean-700">
                        <Name participant={author ?? null} />
                      </p>
                    )}
                    <p className={`whitespace-pre-wrap break-words font-semibold ${mine ? "" : "text-slate-700"}`}>
                      {m.content}
                    </p>
                    <p className={`mt-0.5 text-right text-[10px] font-bold ${mine ? "text-white/60" : "text-slate-300"}`}>
                      {formatClock(m.created_at)}
                    </p>
                  </button>

                  {pickerFor === m.id && (
                    <div className={`z-10 mt-1 flex gap-1 rounded-full border border-ocean-100 bg-white px-2 py-1 shadow-lg ${mine ? "self-end" : ""}`}>
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className={`rounded-full p-1 text-lg transition active:scale-125 ${
                            myReactions.has(`${m.id}:${emoji}`) ? "bg-ocean-100" : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {(reactionsByMsg.get(m.id)?.size ?? 0) > 0 && (
                    <div className={`-mt-1 flex gap-1 ${mine ? "self-end" : ""}`}>
                      {[...reactionsByMsg.get(m.id)!.entries()].map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(m.id, emoji)}
                          className={`rounded-full border px-1.5 py-0.5 text-xs font-bold shadow-sm ${
                            myReactions.has(`${m.id}:${emoji}`)
                              ? "border-ocean-300 bg-ocean-100 text-ocean-800"
                              : "border-ocean-100 bg-white text-slate-500"
                          }`}
                        >
                          {emoji} {count > 1 ? count : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[calc(3.4rem+env(safe-area-inset-bottom))] border-t border-ocean-100 bg-white/95 p-2 backdrop-blur">
        {visitor ? (
          <p className="py-2 text-center text-sm font-bold text-slate-400">
            👀 Mode visiteur — lecture seule
          </p>
        ) : (
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <textarea
            className="input min-h-[2.6rem] max-h-28 flex-1 resize-none !py-2"
            placeholder="Ton message…"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={1000}
          />
          <button onClick={send} disabled={!draft.trim() || sending} className="btn-primary shrink-0 !px-3.5">
            ➤
          </button>
        </div>
        )}
      </div>
    </main>
  );
}
