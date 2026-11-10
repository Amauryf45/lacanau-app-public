"use client";

import Link from "next/link";
import { useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import {
  useActivities,
  useCompletions,
  useCompletionVotes,
  useDailyCompletions,
  useDares,
  useLeaderboard,
  useNotes,
  useParticipants,
  useKillerPublic,
  usePhotos,
  usePolls,
  useQuests,
} from "@/lib/hooks";
import { Avatar, Name, Sheet, Spinner } from "@/components/ui";
import { RestrictionBanner, RestrictionPopup, restrictionText } from "@/components/restriction";
import { TRICOUNT_URL, VLOG_DRIVE_URL, displayName } from "@/lib/types";
import type { Diet, Participant } from "@/lib/types";
import { formatRelative, formatTime, toISODate, tripStatus } from "@/lib/dates";

const MEDALS = ["🥇", "🥈", "🥉"];

function DietPrompt({ me, onSaved }: { me: Participant | null; onSaved: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!me || me.diet || dismissed || me.restricted) return null;

  async function choose(diet: Diet) {
    setBusy(true);
    const { error } = await supabase.from("participants").update({ diet }).eq("id", me!.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    onSaved();
  }

  return (
    <Sheet open onClose={() => setDismissed(true)} title="Petite question cuisine 🍳">
      <p className="font-semibold text-slate-600">
        Pour aider les équipes aux fourneaux : tu manges comment ?
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => choose("vegetarien")}
          disabled={busy}
          className="btn-ghost flex-1 !bg-emerald-50 !text-emerald-700 !py-4"
        >
          🥦 Végétarien
        </button>
        <button onClick={() => choose("omnivore")} disabled={busy} className="btn-ghost flex-1 !py-4">
          🍖 De tout
        </button>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-slate-400">
        Modifiable à tout moment dans les réglages ⚙️
      </p>
    </Sheet>
  );
}

function HomeCard({
  href,
  external = false,
  blocked = false,
  onBlocked,
  className = "",
  children,
}: {
  href: string;
  external?: boolean;
  blocked?: boolean;
  onBlocked?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `card flex items-center gap-2 !p-3 ${className}`;
  if (blocked) {
    return (
      <button onClick={onBlocked} className={`${cls} grayscale opacity-40 text-left`}>
        {children}
      </button>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default function HomePage() {
  const { session, ready } = useSession();
  const { data: participants, mutate: mutateParticipants } = useParticipants();
  const { data: leaderboard } = useLeaderboard();
  const { data: activities } = useActivities();
  const { data: completions } = useCompletions();
  const { data: votes } = useCompletionVotes();
  const { data: dares } = useDares();
  const { data: notes } = useNotes();
  const { data: photos } = usePhotos();
  const { data: polls } = usePolls();
  const { data: quests } = useQuests();
  const { data: killer } = useKillerPublic();
  const { data: dailies } = useDailyCompletions();

  const [sanctionPopup, setSanctionPopup] = useState<string | null>(null);

  if (!ready || !session) return <Spinner />;

  const me = participants?.find((p) => p.id === session.participantId);
  const iAmRestricted = !!me?.restricted;
  const openOwnSanction = () => me && setSanctionPopup(restrictionText(me, true));
  const status = tripStatus();
  const today = toISODate(new Date());
  const todayActivities = (activities ?? []).filter((a) => a.day === today && a.status === "confirmed");

  const myVotes = new Set((votes ?? []).filter((v) => v.voter_id === session.participantId).map((v) => v.completion_id));
  const toValidate = (completions ?? []).filter(
    (c) => c.status === "pending" && c.participant_id !== session.participantId && !myVotes.has(c.id)
  ).length;

  const myDares = (dares ?? []).filter(
    (d) => d.target_id === session.participantId && d.status === "proposed"
  ).length;

  const top3 = (leaderboard ?? []).slice(0, 3).filter((r) => r.points > 0);

  const byId = new Map((participants ?? []).map((p) => [p.id, p]));
  const questById = new Map((quests ?? []).map((q) => [q.id, q]));
  const who = (id: string | null | undefined) => {
    const p = id ? byId.get(id) : null;
    return p ? displayName(p as Participant) : "Quelqu'un";
  };

  type FeedItem = { ts: string; emoji: string; text: string; href: string; thumb?: string; popup?: string };
  const feed: FeedItem[] = [
    ...(participants ?? [])
      .filter((p) => p.restricted && p.restricted_at)
      .map((p) => ({
        ts: p.restricted_at!,
        emoji: "⛔",
        text: `${p.name} a perdu l'accès à l'app`,
        href: "",
        popup: restrictionText(p, false),
      })),
    ...(photos ?? []).map((p) => ({
      ts: p.created_at,
      emoji: "📸",
      text: `${who(p.uploaded_by)} a partagé une photo`,
      href: "/photos",
      thumb: p.url,
    })),
    ...(dares ?? []).map((d) => ({
      ts: d.created_at,
      emoji: "🔥",
      text: `${who(d.challenger_id)} défie ${who(d.target_id)} : « ${d.title} »`,
      href: "/defis",
    })),
    ...(polls ?? []).map((p) => ({
      ts: p.created_at,
      emoji: "🗳️",
      text: `${who(p.created_by)} a lancé un sondage : « ${p.question} »`,
      href: "/sondages",
    })),
    ...(notes ?? []).map((n) => ({
      ts: n.created_at,
      emoji: "🎭",
      text: "Nouvelle note anonyme…",
      href: "/notes",
    })),
    ...(quests ?? [])
      .filter((q) => q.created_by)
      .map((q) => ({
        ts: q.created_at,
        emoji: "✨",
        text: `${who(q.created_by)} propose une quête : « ${q.title} »`,
        href: "/quetes",
      })),
    ...(completions ?? [])
      .filter((c) => questById.has(c.quest_id))
      .map((c) => ({
        ts: c.created_at,
        emoji: c.status === "validated" ? "✅" : "🙋",
        text: `${who(c.participant_id)} ${c.status === "validated" ? "a réussi" : "dit avoir fait"} « ${
          questById.get(c.quest_id)!.title
        } »`,
        href: "/quetes",
      })),
    ...(activities ?? [])
      .filter((a) => a.status === "proposed")
      .map((a) => ({
        ts: a.created_at,
        emoji: "💡",
        text: `${who(a.proposed_by)} propose : ${a.title}`,
        href: "/planning",
      })),
    ...(killer ?? [])
      .filter((k) => !k.alive && k.killed_at)
      .map((k) => ({
        ts: k.killed_at!,
        emoji: "🔪",
        text: `${who(k.participant_id)} a été tué·e en faisant « ${k.death_mission} »`,
        href: "/killer",
      })),
    ...(dailies ?? [])
      .filter((d) => d.status === "validated")
      .map((d) => ({
        ts: d.created_at,
        emoji: "📹",
        text: `${who(d.participant_id)} a ajouté une vidéo au vlog`,
        href: "/quetes",
      })),
  ]
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 8);

  return (
    <main>
      <header className="px-4 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              Salut {me ? displayName(me) : session.name} ! {me?.emoji}
            </h1>
            <p className="mt-1 font-bold text-ocean-700">
              {status.phase === "avant" && `J-${status.day} avant Lacanau 🤙`}
              {status.phase === "pendant" && `Jour ${status.day}/8 à Lacanau 🌊`}
              {status.phase === "apres" && "C'est fini… mais quelle semaine 🥲"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {iAmRestricted ? (
              <>
                <button onClick={openOwnSanction} className="text-2xl grayscale opacity-40" aria-label="Les règles du jeu">
                  ❓
                </button>
                <button onClick={openOwnSanction} className="text-2xl grayscale opacity-40" aria-label="Réglages">
                  ⚙️
                </button>
              </>
            ) : (
              <>
                <Link href="/regles" className="text-2xl" aria-label="Les règles du jeu">
                  ❓
                </Link>
                <Link href="/reglages" className="text-2xl" aria-label="Réglages">
                  ⚙️
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <RestrictionBanner />

      {!isVisitor(session) && !iAmRestricted && (toValidate > 0 || myDares > 0) && (
        <section className="mx-4 mt-3 space-y-2">
          {toValidate > 0 && (
            <Link href="/quetes" className="card !border-amber-200 !bg-amber-50 flex items-center gap-3">
              <span className="text-2xl">🗳️</span>
              <span className="font-bold text-amber-800">
                {toValidate} preuve{toValidate > 1 ? "s" : ""} de quête à valider !
              </span>
            </Link>
          )}
          {myDares > 0 && (
            <Link href="/defis" className="card !border-rose-200 !bg-rose-50 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-rose-800">
                On t&apos;a lancé {myDares} défi{myDares > 1 ? "s" : ""} — chiche ?
              </span>
            </Link>
          )}
        </section>
      )}

      <section className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <HomeCard href="/quetes" blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🎯</span>
          <span className="font-bold text-slate-700">Quêtes</span>
        </HomeCard>
        <HomeCard href="/defis" blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-slate-700">Défis</span>
        </HomeCard>
        <HomeCard href="/sondages" blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🗳️</span>
          <span className="font-bold text-slate-700">Sondages</span>
        </HomeCard>
        <HomeCard href="/notes" blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🎭</span>
          <span className="font-bold text-slate-700">
            Potins{notes && notes.length > 0 ? ` (${notes.length})` : ""}
          </span>
        </HomeCard>
        <HomeCard href="/killer" blocked={iAmRestricted} onBlocked={openOwnSanction} className="!border-slate-600 !bg-slate-800">
          <span className="text-2xl">🔪</span>
          <span className="font-bold text-white">Killer</span>
        </HomeCard>
        <HomeCard href="/classement" blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🏆</span>
          <span className="font-bold text-slate-700">Classement</span>
        </HomeCard>
        <HomeCard href="/repas" className="col-span-2">
          <span className="text-2xl">🍽️</span>
          <span className="font-bold text-slate-700">Repas & liste de courses</span>
        </HomeCard>
        <HomeCard href={TRICOUNT_URL} external blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">💶</span>
          <span className="font-bold text-slate-700">Tricount</span>
        </HomeCard>
        <HomeCard href={VLOG_DRIVE_URL} external blocked={iAmRestricted} onBlocked={openOwnSanction}>
          <span className="text-2xl">🎥</span>
          <span className="font-bold text-slate-700">Drive vlog</span>
        </HomeCard>
      </section>

      {feed.length > 0 && (
        <section className="mx-4 mt-4">
          <div className="card">
            <h2 className="font-black text-slate-700">🌊 Quoi de neuf</h2>
            <ul className="mt-2 divide-y divide-ocean-50">
              {feed.map((item) => {
                const content = (
                  <>
                    <span className="text-lg">{item.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-700">{item.text}</span>
                      <span className="text-xs font-semibold text-slate-400">{formatRelative(item.ts)}</span>
                    </span>
                    {item.thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumb} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                  </>
                );
                const key = `${item.href}-${item.ts}-${item.text}`;
                if (item.popup) {
                  return (
                    <li key={key}>
                      <button onClick={() => setSanctionPopup(item.popup!)} className="flex w-full items-center gap-2.5 py-2 text-left">
                        {content}
                      </button>
                    </li>
                  );
                }
                if (iAmRestricted) {
                  return (
                    <li key={key}>
                      <div className="flex items-center gap-2.5 py-2">{content}</div>
                    </li>
                  );
                }
                return (
                  <li key={key}>
                    <Link href={item.href} className="flex items-center gap-2.5 py-2">
                      {content}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-4 mt-4">
        <div className="card">
          <h2 className="font-black text-slate-700">📅 Aujourd&apos;hui</h2>
          {todayActivities.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Rien de prévu — plage par défaut 🏖️
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todayActivities.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-ocean-700 w-14 shrink-0">
                    {a.start_time ? formatTime(a.start_time) : "—"}
                  </span>
                  <span className="font-bold text-slate-700">{a.title}</span>
                  {a.location && <span className="text-sm text-slate-400">· {a.location}</span>}
                </li>
              ))}
            </ul>
          )}
          {iAmRestricted ? (
            <button onClick={openOwnSanction} className="mt-3 inline-block text-sm font-bold text-slate-300">
              Voir la semaine →
            </button>
          ) : (
            <Link href="/planning" className="mt-3 inline-block text-sm font-bold text-ocean-600">
              Voir la semaine →
            </Link>
          )}
        </div>
      </section>

      {top3.length > 0 && !iAmRestricted && (
        <section className="mx-4 mt-4">
          <Link href="/classement" className="card block">
            <h2 className="font-black text-slate-700">🏆 En tête</h2>
            <ul className="mt-2 space-y-1.5">
              {top3.map((row, i) => (
                <li key={row.id} className="flex items-center gap-2">
                  <span>{MEDALS[i]}</span>
                  <Avatar participant={row} size="sm" />
                  <span className="font-bold text-slate-700"><Name participant={row} /></span>
                  <span className="ml-auto font-black text-ocean-700">{row.points} pts</span>
                </li>
              ))}
            </ul>
          </Link>
        </section>
      )}

      {!isVisitor(session) && <DietPrompt me={me ?? null} onSaved={() => mutateParticipants()} />}

      <RestrictionPopup open={!!sanctionPopup} onClose={() => setSanctionPopup(null)} text={sanctionPopup ?? ""} />

      <p className="mt-6 mb-2 text-center text-xs font-semibold text-slate-300">
        {photos ? `${photos.length} photo${photos.length > 1 ? "s" : ""} partagée${photos.length > 1 ? "s" : ""} 📸 · ` : ""}
        Lacanau 2026
      </p>
    </main>
  );
}
