"use client";

import { useEffect } from "react";
import type { Participant } from "@/lib/types";
import { displayName } from "@/lib/types";

export function Avatar({
  participant,
  size = "md",
}: {
  participant: Pick<Participant, "emoji" | "name"> | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "sm" ? "h-7 w-7 text-sm" : size === "lg" ? "h-14 w-14 text-3xl" : "h-10 w-10 text-xl";
  return (
    <span
      className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full bg-ocean-100 border border-ocean-200`}
      title={participant?.name}
    >
      {participant?.emoji ?? "🙂"}
    </span>
  );
}

export function PageHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <header className="px-4 pt-6 pb-3">
      <h1 className="text-2xl font-black text-slate-800">
        {emoji} {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}

/** Bottom sheet mobile. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto max-w-lg">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">{title}</h2>
            <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
              Fermer
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Pseudo avec le prénom en petit à côté (si un pseudo est défini). */
export function Name({ participant }: { participant: Pick<Participant, "name" | "nickname"> | null }) {
  if (!participant) return <>?</>;
  const nick = participant.nickname?.trim();
  if (!nick || nick === participant.name) return <>{participant.name}</>;
  return (
    <>
      {nick} <span className="text-[10px] font-semibold text-slate-400">({participant.name})</span>
    </>
  );
}

export function NameChip({ participant }: { participant: Pick<Participant, "name" | "nickname" | "emoji"> }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
      <span>{participant.emoji}</span>
      {displayName(participant)}
    </span>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="card mx-4 my-6 flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ocean-200 border-t-ocean-600" />
    </div>
  );
}
