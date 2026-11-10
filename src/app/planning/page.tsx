"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import Link from "next/link";
import { useActivities, useActivityInterest, useMealGroups, useMeals, useParticipants } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { Avatar, PageHeader, Sheet, Spinner } from "@/components/ui";
import { displayName } from "@/lib/types";
import { TRIP_DAYS, formatDayLong, formatDayShort, formatTime, toISODate } from "@/lib/dates";
import type { Activity } from "@/lib/types";

export default function PlanningPage() {
  const { session, ready } = useSession();
  const { data: activities, mutate: mutateActivities } = useActivities();
  const { data: interests, mutate: mutateInterests } = useActivityInterest();
  const { data: participants } = useParticipants();
  const { data: meals } = useMeals();
  const { data: mealGroups } = useMealGroups();

  const today = toISODate(new Date());
  const [selectedDay, setSelectedDay] = useState(
    TRIP_DAYS.includes(today) ? today : TRIP_DAYS[0]
  );
  const [newOpen, setNewOpen] = useState(false);

  const byId = useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);

  if (!ready || !session) return <Spinner />;
  if (!activities || !participants) return <Spinner />;

  const myId = session.participantId;
  const visitor = isVisitor(session);
  const dayActivities = activities.filter((a) => a.day === selectedDay && a.status === "confirmed");
  const proposals = activities.filter((a) => a.status === "proposed");
  const mealGroupById = new Map((mealGroups ?? []).map((g) => [g.id, g]));
  const dayMeals = (meals ?? []).filter((m) => m.day === selectedDay);

  async function setGoing(activity: Activity, going: boolean) {
    const { error } = await supabase
      .from("activity_interest")
      .upsert(
        { activity_id: activity.id, participant_id: myId, going },
        { onConflict: "activity_id,participant_id" }
      );
    if (error) alert(error.message);
    mutateInterests();
  }

  return (
    <main>
      <PageHeader emoji="📅" title="Planning" subtitle="La semaine, jour par jour." />

      <div className="no-scrollbar mx-4 flex gap-2 overflow-x-auto pb-1">
        {TRIP_DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`chip shrink-0 transition ${
              selectedDay === day
                ? "bg-ocean-600 text-white"
                : day === today
                  ? "bg-sand-200 text-slate-700"
                  : "bg-white text-slate-500 border border-ocean-100"
            }`}
          >
            {formatDayShort(day)}
          </button>
        ))}
      </div>

      <section className="mx-4 mt-3">
        <div className="card">
          <h2 className="font-black text-slate-700">
            {formatDayLong(selectedDay)}
            {selectedDay === today && " · aujourd'hui 🌞"}
          </h2>
          {dayMeals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {dayMeals.map((m) => (
                <li key={m.id}>
                  <Link href="/repas" className="flex items-baseline gap-2 text-sm">
                    <span className="w-14 shrink-0 font-black text-sunset-500">
                      {m.slot === "midi" ? "☀️ Midi" : "🌙 Soir"}
                    </span>
                    <span className="font-bold text-slate-700">
                      {m.title?.trim() || "Plat à définir"}
                    </span>
                    <span className="min-w-0 truncate text-xs text-slate-400">
                      · {mealGroupById.get(m.group_id)?.name ?? "?"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {dayActivities.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Journée libre — plage, sieste, apéro 🏖️
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {dayActivities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-14 shrink-0 pt-0.5 text-sm font-black text-ocean-700">
                    {a.start_time ? formatTime(a.start_time) : "—"}
                  </span>
                  <div>
                    <p className="font-bold text-slate-800">{a.title}</p>
                    {a.location && <p className="text-sm text-slate-400">📍 {a.location}</p>}
                    {a.description && <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mx-4 mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-black text-slate-700">💡 Activités proposées</h2>
          {!visitor && (
            <button onClick={() => setNewOpen(true)} className="text-sm font-black text-ocean-600">
              ➕ Proposer
            </button>
          )}
        </div>
        {proposals.length === 0 ? (
          <div className="card">
            <p className="text-sm font-semibold text-slate-400">
              Personne n&apos;a rien proposé. Surf ? Marché ? Soirée moules-frites ?
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((a) => {
              const activityInterests = (interests ?? []).filter((i) => i.activity_id === a.id);
              const going = activityInterests.filter((i) => i.going);
              const notGoing = activityInterests.filter((i) => !i.going);
              const mine = activityInterests.find((i) => i.participant_id === myId);
              const proposer = a.proposed_by ? byId.get(a.proposed_by) : null;
              return (
                <div key={a.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-800">{a.title}</h3>
                      {a.description && <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>}
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {proposer ? `par ${displayName(proposer)}` : ""}
                        {a.day ? ` · souhaité ${formatDayShort(a.day)}` : ""}
                        {a.location ? ` · 📍 ${a.location}` : ""}
                      </p>
                    </div>
                  </div>
                  {going.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {going.slice(0, 10).map((i) => (
                        <Avatar key={i.id} participant={byId.get(i.participant_id) ?? null} size="sm" />
                      ))}
                      <span className="ml-1 text-xs font-bold text-emerald-600">
                        {going.length} partant{going.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {notGoing.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 opacity-70">
                      {notGoing.slice(0, 10).map((i) => (
                        <Avatar key={i.id} participant={byId.get(i.participant_id) ?? null} size="sm" />
                      ))}
                      <span className="ml-1 text-xs font-bold text-slate-400">
                        {notGoing.length} pas partant{notGoing.length > 1 ? "s" : ""} 😴
                      </span>
                    </div>
                  )}
                  <div className={`mt-3 flex gap-2 ${visitor ? "hidden" : ""}`}>
                    <button
                      onClick={() => setGoing(a, true)}
                      className={`flex-1 rounded-xl py-2 font-bold transition active:scale-95 ${
                        mine?.going === true ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      🙋 Partant
                    </button>
                    <button
                      onClick={() => setGoing(a, false)}
                      className={`flex-1 rounded-xl py-2 font-bold transition active:scale-95 ${
                        mine?.going === false ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      😴 Sans moi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mx-4 mt-4 mb-2 text-center text-xs font-semibold text-slate-400">
        Une activité proposée apparaît au planning quand l&apos;admin la confirme ✅
      </p>

      <NewActivitySheet
        open={newOpen}
        myId={myId}
        onClose={() => setNewOpen(false)}
        onDone={() => {
          setNewOpen(false);
          mutateActivities();
        }}
      />
    </main>
  );
}

function NewActivitySheet({
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
  const [day, setDay] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (title.trim().length < 3) {
      setError("Donne un nom à ton activité 😄");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.from("activities").insert({
      title: title.trim(),
      description: description.trim() || null,
      proposed_by: myId,
      day: day || null,
      location: location.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setDescription("");
    setDay("");
    setLocation("");
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Proposer une activité 💡">
      <input
        className="input"
        placeholder="Quoi ? (surf, marché, beach-volley…)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        className="input mt-3 min-h-16"
        placeholder="Détails (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={300}
      />
      <div className="mt-3 flex gap-2">
        <select className="input flex-1" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">Jour indifférent</option>
          {TRIP_DAYS.map((d) => (
            <option key={d} value={d}>
              {formatDayLong(d)}
            </option>
          ))}
        </select>
      </div>
      <input
        className="input mt-3"
        placeholder="Lieu (optionnel)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        maxLength={80}
      />
      {error && <p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Envoi…" : "Proposer 🚀"}
      </button>
    </Sheet>
  );
}
