"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useActivities,
  useDailyCompletions,
  useNotes,
  useParticipants,
  usePhotos,
  usePolls,
  useQuests,
} from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { PageHeader, Sheet, Spinner } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/types";
import type { Activity, QuestLevel } from "@/lib/types";
import { TRIP_DAYS, formatDayLong, formatDayShort } from "@/lib/dates";

type Tab = "planning" | "quetes" | "participants" | "moderation";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("planning");

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.ok))
      .catch(() => setAuthed(false));
  }, []);

  async function login() {
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) setAuthed(true);
    else setError("Mauvais code 🙅");
  }

  if (authed === null) return <Spinner />;

  if (!authed) {
    return (
      <main>
        <PageHeader emoji="🔧" title="Espace organisateur" subtitle="Réservé au staff de la semaine." />
        <div className="card mx-4">
          <input
            className="input text-center text-2xl tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          {error && <p className="mt-2 text-center text-sm font-bold text-rose-600">{error}</p>}
          <button onClick={login} className="btn-primary mt-3 w-full">
            Entrer
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <PageHeader emoji="🔧" title="Admin" subtitle="Avec de grands pouvoirs…" />
      <div className="no-scrollbar mx-4 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["planning", "📅 Planning"],
            ["quetes", "🎯 Quêtes"],
            ["participants", "👥 Participants"],
            ["moderation", "🧹 Modération"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`chip shrink-0 ${tab === key ? "bg-ocean-600 text-white" : "bg-white text-slate-500 border border-ocean-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mx-4 mt-3">
        {tab === "planning" && <PlanningAdmin />}
        {tab === "quetes" && <QuestsAdmin />}
        {tab === "participants" && <ParticipantsAdmin />}
        {tab === "moderation" && <ModerationAdmin />}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- planning

function PlanningAdmin() {
  const { data: activities, mutate } = useActivities();
  const [editing, setEditing] = useState<Activity | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (!activities) return <Spinner />;

  const proposals = activities.filter((a) => a.status === "proposed");
  const confirmed = activities.filter((a) => a.status === "confirmed");

  async function cancel(a: Activity) {
    if (!confirm(`Annuler « ${a.title} » ?`)) return;
    await supabase.from("activities").update({ status: "cancelled" }).eq("id", a.id);
    mutate();
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setCreateOpen(true)} className="btn-primary w-full">
        ➕ Créer un événement
      </button>

      {proposals.length > 0 && (
        <section>
          <h2 className="mb-2 font-black text-amber-700">💡 Propositions à traiter</h2>
          <div className="space-y-2">
            {proposals.map((a) => (
              <div key={a.id} className="card !p-3">
                <p className="font-bold text-slate-700">{a.title}</p>
                {a.day && <p className="text-xs text-slate-400">souhaité : {formatDayShort(a.day)}</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setEditing(a)} className="btn-primary flex-1 !py-1.5 text-sm">
                    ✅ Placer au planning
                  </button>
                  <button onClick={() => cancel(a)} className="btn-ghost flex-1 !py-1.5 text-sm !bg-rose-100 !text-rose-700">
                    ✖️ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-black text-slate-700">✅ Au planning</h2>
        <div className="space-y-2">
          {confirmed.map((a) => (
            <div key={a.id} className="card !p-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-slate-700">{a.title}</p>
                <p className="text-xs text-slate-400">
                  {a.day ? formatDayLong(a.day) : "sans jour"}
                  {a.start_time ? ` · ${a.start_time.slice(0, 5)}` : ""}
                  {a.location ? ` · ${a.location}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(a)} className="rounded-lg bg-slate-100 px-2 py-1 text-sm">✏️</button>
                <button onClick={() => cancel(a)} className="rounded-lg bg-rose-50 px-2 py-1 text-sm">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ActivitySheet
        activity={editing}
        createMode={false}
        open={!!editing}
        onClose={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          mutate();
        }}
      />
      <ActivitySheet
        activity={null}
        createMode
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          mutate();
        }}
      />
    </div>
  );
}

function ActivitySheet({
  activity,
  createMode,
  open,
  onClose,
  onDone,
}: {
  activity: Activity | null;
  createMode: boolean;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(activity?.title ?? "");
    setDay(activity?.day ?? "");
    setTime(activity?.start_time?.slice(0, 5) ?? "");
    setLocation(activity?.location ?? "");
    setDescription(activity?.description ?? "");
  }, [activity, open]);

  async function submit() {
    if (title.trim().length < 2) return;
    setBusy(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      day: day || null,
      start_time: time || null,
      location: location.trim() || null,
      status: "confirmed" as const,
    };
    const res = createMode
      ? await supabase.from("activities").insert(payload)
      : await supabase.from("activities").update(payload).eq("id", activity!.id);
    setBusy(false);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <Sheet open={open} onClose={onClose} title={createMode ? "Créer un événement 📅" : "Placer au planning 📅"}>
      <input className="input" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="mt-3 flex gap-2">
        <select className="input flex-1" value={day} onChange={(e) => setDay(e.target.value)}>
          <option value="">Jour ?</option>
          {TRIP_DAYS.map((d) => (
            <option key={d} value={d}>
              {formatDayLong(d)}
            </option>
          ))}
        </select>
        <input type="time" className="input w-32" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <input
        className="input mt-3"
        placeholder="Lieu (optionnel)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <textarea
        className="input mt-3 min-h-16"
        placeholder="Description (optionnel)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "…" : "Enregistrer ✅"}
      </button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- quêtes

function QuestsAdmin() {
  const { data: quests, mutate } = useQuests();
  const { data: dailies, mutate: mutateDailies } = useDailyCompletions();
  const participantsById = useParticipantsById();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<QuestLevel>("fun");
  const points = { soft: 10, fun: 20, epice: 30, perso: 25 }[level];

  if (!quests) return <Spinner />;

  const pendingDailies = (dailies ?? []).filter((d) => d.status === "pending");

  async function judgeDaily(id: string, validated: boolean) {
    await supabase
      .from("daily_completions")
      .update({ status: validated ? "validated" : "rejected" })
      .eq("id", id);
    mutateDailies();
  }

  async function add() {
    if (title.trim().length < 3) return;
    await supabase.from("quests").insert({ title: title.trim(), level, points });
    setTitle("");
    mutate();
  }

  async function deactivate(id: string) {
    await supabase.from("quests").update({ active: false }).eq("id", id);
    mutate();
  }

  return (
    <div className="space-y-4">
      {pendingDailies.length > 0 && (
        <section>
          <h2 className="mb-2 font-black text-amber-700">📹 Vidéos du jour à valider ({pendingDailies.length})</h2>
          <div className="space-y-2">
            {pendingDailies.map((d) => (
              <div key={d.id} className="card !p-3 flex items-center justify-between gap-2">
                <p className="font-bold text-slate-700">
                  {participantsById.get(d.participant_id)?.name ?? "?"}
                  <span className="ml-1 text-xs font-semibold text-slate-400">({d.day})</span>
                </p>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => judgeDaily(d.id, true)} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                    ✅ +5
                  </button>
                  <button onClick={() => judgeDaily(d.id, false)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-sm">
                    ✖️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card">
        <h2 className="font-black text-slate-700">➕ Nouvelle quête</h2>
        <input
          className="input mt-2"
          placeholder="Titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <select className="input flex-1" value={level} onChange={(e) => setLevel(e.target.value as QuestLevel)}>
            <option value="soft">Soft (10 pts)</option>
            <option value="fun">Fun (20 pts)</option>
            <option value="epice">Épicé (30 pts)</option>
          </select>
          <button onClick={add} className="btn-primary">
            Ajouter
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {quests.map((quest) => (
          <div key={quest.id} className="card !p-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-slate-700">{quest.title}</p>
              <p className="text-xs text-slate-400">
                {LEVEL_LABELS[quest.level]} · {quest.points} pts
              </p>
            </div>
            <button
              onClick={() => confirm(`Retirer « ${quest.title} » ?`) && deactivate(quest.id)}
              className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-sm"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- participants

function ParticipantsAdmin() {
  const { data: participants, mutate } = useParticipants();
  const [name, setName] = useState("");

  if (!participants) return <Spinner />;

  async function add() {
    if (name.trim().length < 2) return;
    const { error } = await supabase.from("participants").insert({ name: name.trim() });
    if (error) alert(error.message);
    setName("");
    mutate();
  }

  async function remove(id: string, pname: string) {
    if (!confirm(`Supprimer ${pname} et tout son historique ?`)) return;
    const { error } = await supabase.from("participants").delete().eq("id", id);
    if (error) alert(error.message);
    mutate();
  }

  async function resetJoker(id: string) {
    await supabase.from("participants").update({ joker_used: false }).eq("id", id);
    mutate();
  }

  return (
    <div className="space-y-4">
      <div className="card flex gap-2">
        <input
          className="input flex-1"
          placeholder="Prénom du petit nouveau"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={add} className="btn-primary shrink-0">
          Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.id} className="card !p-3 flex items-center gap-3">
            <span className="text-xl">{p.emoji}</span>
            <div>
              <p className="font-bold text-slate-700">{p.name}</p>
              <p className="text-xs text-slate-400">
                {p.nickname ? `alias ${p.nickname} · ` : ""}
                joker {p.joker_used ? "utilisé" : "dispo"}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 gap-1">
              {p.joker_used && (
                <button onClick={() => resetJoker(p.id)} className="rounded-lg bg-violet-50 px-2 py-1 text-sm" title="Rendre le joker">
                  🃏
                </button>
              )}
              <button onClick={() => remove(p.id, p.name)} className="rounded-lg bg-rose-50 px-2 py-1 text-sm">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- modération

function ModerationAdmin() {
  const { data: notes, mutate: mutateNotes } = useNotes();
  const { data: photos, mutate: mutatePhotos } = usePhotos();
  const { data: polls, mutate: mutatePolls } = usePolls();
  const participantsById = useParticipantsById();

  async function deleteNote(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    const { error } = await supabase.rpc("delete_note", { p_note: id });
    if (error) alert(error.message);
    mutateNotes();
  }

  async function deletePhoto(id: string, url: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    const path = url.split("/storage/v1/object/public/photos/")[1];
    if (path) await supabase.storage.from("photos").remove([decodeURIComponent(path)]);
    await supabase.from("photos").delete().eq("id", id);
    mutatePhotos();
  }

  async function togglePoll(id: string, closed: boolean) {
    await supabase.from("polls").update({ closed: !closed }).eq("id", id);
    mutatePolls();
  }

  async function deletePoll(id: string) {
    if (!confirm("Supprimer ce sondage ?")) return;
    await supabase.from("polls").delete().eq("id", id);
    mutatePolls();
  }

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 font-black text-slate-700">🎭 Notes ({notes?.length ?? 0})</h2>
        <div className="space-y-2">
          {(notes ?? []).map((n) => (
            <div key={n.id} className="card !p-3 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-600">{n.content}</p>
              <button onClick={() => deleteNote(n.id)} className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-sm">
                🗑️
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-black text-slate-700">📸 Photos ({photos?.length ?? 0})</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {(photos ?? []).map((photo) => (
            <button key={photo.id} onClick={() => deletePhoto(photo.id, photo.url)} className="relative aspect-square overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-lg">🗑️</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-black text-slate-700">🗳️ Sondages ({polls?.length ?? 0})</h2>
        <div className="space-y-2">
          {(polls ?? []).map((poll) => (
            <div key={poll.id} className="card !p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-600">{poll.question}</p>
                <p className="text-xs text-slate-400">
                  par {participantsById.get(poll.created_by)?.name ?? "?"} · {poll.closed ? "clos" : "ouvert"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => togglePoll(poll.id, poll.closed)} className="rounded-lg bg-slate-100 px-2 py-1 text-sm">
                  {poll.closed ? "🔓" : "🔒"}
                </button>
                <button onClick={() => deletePoll(poll.id)} className="rounded-lg bg-rose-50 px-2 py-1 text-sm">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function useParticipantsById() {
  const { data: participants } = useParticipants();
  return useMemo(() => new Map((participants ?? []).map((p) => [p.id, p])), [participants]);
}
