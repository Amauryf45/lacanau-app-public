"use client";

import { useMemo, useState } from "react";
import { isVisitor, useSession } from "@/lib/session";
import {
  useMealGroupMembers,
  useMealGroups,
  useMealItems,
  useMeals,
  useParticipants,
} from "@/lib/hooks";
import { supabase } from "@/lib/supabase";
import { PageHeader, Spinner } from "@/components/ui";
import { RestrictionBanner } from "@/components/restriction";
import { SHOPPING_CATEGORIES, displayName } from "@/lib/types";
import type { Meal, MealItem, MealSlot } from "@/lib/types";
import { formatDayLong, formatDayShort } from "@/lib/dates";

type View = "menu" | "liste" | "triee" | "midi" | "soir";

const SLOT_LABEL: Record<MealSlot, string> = { midi: "☀️ Midi", soir: "🌙 Soir" };

export default function RepasPage() {
  const { session, ready } = useSession();
  const { data: groups } = useMealGroups();
  const { data: members } = useMealGroupMembers();
  const { data: meals, mutate: mutateMeals } = useMeals();
  const { data: items, mutate: mutateItems } = useMealItems();
  const { data: participants } = useParticipants();

  const [view, setView] = useState<View>("menu");

  const groupById = useMemo(() => new Map((groups ?? []).map((g) => [g.id, g])), [groups]);
  const participantById = useMemo(
    () => new Map((participants ?? []).map((p) => [p.id, p])),
    [participants]
  );

  if (!ready || !session) return <Spinner />;
  if (!groups || !members || !meals || !items || !participants) return <Spinner />;

  const myGroup = (() => {
    const m = members.find((mm) => mm.participant_id === session.participantId);
    return m ? groupById.get(m.group_id) ?? null : null;
  })();

  const groupMemberNames = (groupId: string) =>
    members
      .filter((m) => m.group_id === groupId)
      .map((m) => participantById.get(m.participant_id))
      .filter(Boolean)
      .map((p) => displayName(p!))
      .join(", ");

  // Prénoms réels — uniquement pour le planning des fourneaux
  const groupFirstNames = (groupId: string) =>
    members
      .filter((m) => m.group_id === groupId)
      .map((m) => participantById.get(m.participant_id)?.name ?? "?")
      .join(", ");

  async function toggleItem(item: MealItem) {
    if (isVisitor(session)) return;
    await supabase.from("meal_items").update({ checked: !item.checked }).eq("id", item.id);
    mutateItems();
  }

  if (view === "triee") {
    const maxRun = Math.max(0, ...items.filter((i) => i.run != null).map((i) => i.run!));
    const runItems = items.filter((i) => i.run === maxRun);
    // Clé de tri : on ignore quantités et emballages pour que les doublons se retrouvent côte à côte
    const sortKey = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[’‘]/g, "'")
        .replace(/^[^a-z]+/, "")
        .replace(/^(kg|g|l|cl|ml|x)\b\s*/, "")
        .replace(/^(de\s+|d')/, "")
        .replace(/^(boites?|paquets?|sachets?|bouteilles?|pots?|grosses?|gros|petits?|petites?|gousses?|filets?|feuilles?|tranches?|barquettes?)\s*(de\s+|d')?/, "")
        .replace(/^(de\s+|d')/, "")
        .replace(/^[^a-z]+/, "");
    return (
      <main>
        <PageHeader
          emoji="🧾"
          title={`Course ${maxRun || 1}`}
          subtitle="Triée par rayon. Les doublons sont côte à côte, comptez-les !"
        />
        <BackButton onClick={() => setView("menu")} />
        <section className="mx-4 mt-3 space-y-4">
          {SHOPPING_CATEGORIES.map(([cat, label]) => {
            const catItems = runItems
              .filter((i) => (i.category ?? "autre") === cat)
              .sort((a, b) => sortKey(a.label).localeCompare(sortKey(b.label)));
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="card">
                <h2 className="font-black text-slate-800">{label}</h2>
                <ul className="mt-2 space-y-1">
                  {catItems.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} />
                  ))}
                </ul>
              </div>
            );
          })}
          {runItems.length === 0 && (
            <p className="text-center text-sm font-semibold text-slate-400">Aucune course figée pour l&apos;instant.</p>
          )}
        </section>
      </main>
    );
  }

  if (view === "liste") {
    const commonItems = items.filter((i) => i.meal_id === null);
    return (
      <main>
        <PageHeader emoji="🛒" title="Liste de courses" subtitle="Tous les plats de la semaine, dans l'ordre." />
        <BackButton onClick={() => setView("menu")} />
        <section className="mx-4 mt-3 space-y-4">
          <CommonItemsCard
            items={commonItems}
            readOnly={isVisitor(session)}
            onToggle={toggleItem}
            onChange={mutateItems}
          />
          {meals.map((meal) => {
            const mealItems = items.filter((i) => i.meal_id === meal.id);
            const group = groupById.get(meal.group_id);
            return (
              <div key={meal.id} className="card">
                <p className="text-xs font-black uppercase tracking-wide text-ocean-600">
                  {SLOT_LABEL[meal.slot]} · {formatDayLong(meal.day)}
                </p>
                <h2 className="mt-0.5 font-black text-slate-800">
                  {meal.title?.trim() || "Plat à définir 🤷"}
                </h2>
                <p className="text-xs font-bold text-slate-400">par {group ? groupMemberNames(group.id) : "?"}</p>
                {mealItems.length === 0 ? (
                  <p className="mt-2 text-sm font-semibold text-slate-300">Pas encore de liste de courses.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {mealItems.map((item) => (
                      <ItemRow key={item.id} item={item} movedOut={item.run !== null} onToggle={() => toggleItem(item)} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </main>
    );
  }

  if (view === "midi" || view === "soir") {
    const meal = myGroup ? meals.find((m) => m.group_id === myGroup.id && m.slot === view) : null;
    return (
      <main>
        <PageHeader
          emoji={view === "midi" ? "☀️" : "🌙"}
          title={view === "midi" ? "Ton déj" : "Ton dîner"}
          subtitle={myGroup ? `Équipe : ${groupMemberNames(myGroup.id)}` : ""}
        />
        <BackButton onClick={() => setView("menu")} />
        {meal && myGroup ? (
          <MealPlanner
            meal={meal}
            items={items.filter((i) => i.meal_id === meal.id)}
            onMealChange={mutateMeals}
            onItemsChange={mutateItems}
            onToggle={toggleItem}
          />
        ) : (
          <p className="mx-4 mt-4 text-sm font-semibold text-slate-400">
            Pas de créneau trouvé pour ton groupe 🤔
          </p>
        )}
      </main>
    );
  }

  const myMeals = myGroup ? meals.filter((m) => m.group_id === myGroup.id) : [];

  return (
    <main>
      <PageHeader emoji="🍽️" title="Repas" subtitle="Qui cuisine quoi, et quand." />
      <div className="mb-3">
        <RestrictionBanner />
      </div>
      <section className="mx-4 space-y-3">
        {myGroup ? (
          <div className="card !bg-sand-100 !border-sand-200">
            <p className="text-sm font-bold text-slate-600">
              👩‍🍳 Ton équipe : <span className="font-black">{groupMemberNames(myGroup.id)}</span>
            </p>
            <ul className="mt-1 text-sm font-semibold text-slate-500">
              {myMeals.map((m) => (
                <li key={m.id}>
                  {SLOT_LABEL[m.slot]} · {formatDayLong(m.day)}
                  {m.title?.trim() ? ` — ${m.title}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="card">
            <p className="text-sm font-semibold text-slate-500">
              Tu n&apos;es dans aucune équipe cuisine (chanceux 😏). La liste complète reste consultable.
            </p>
          </div>
        )}

        {myGroup && (
          <>
            <button onClick={() => setView("midi")} className="card flex w-full items-center gap-3 text-left active:scale-[0.99] transition">
              <span className="text-3xl">☀️</span>
              <span>
                <span className="block font-black text-slate-800">Planifier mon déj</span>
                <span className="text-sm font-semibold text-slate-400">Nom du plat + liste de courses</span>
              </span>
            </button>
            <button onClick={() => setView("soir")} className="card flex w-full items-center gap-3 text-left active:scale-[0.99] transition">
              <span className="text-3xl">🌙</span>
              <span>
                <span className="block font-black text-slate-800">Planifier mon dîner</span>
                <span className="text-sm font-semibold text-slate-400">Nom du plat + liste de courses</span>
              </span>
            </button>
          </>
        )}

        <button onClick={() => setView("liste")} className="card flex w-full items-center gap-3 text-left active:scale-[0.99] transition">
          <span className="text-3xl">🛒</span>
          <span>
            <span className="block font-black text-slate-800">Liste de courses complète</span>
            <span className="text-sm font-semibold text-slate-400">Tous les plats, tous les ingrédients</span>
          </span>
        </button>

        <button onClick={() => setView("triee")} className="card flex w-full items-center gap-3 text-left active:scale-[0.99] transition">
          <span className="text-3xl">🧾</span>
          <span>
            <span className="block font-black text-slate-800">Liste triée par rayon</span>
            <span className="text-sm font-semibold text-slate-400">La Course 1, prête pour le supermarché</span>
          </span>
        </button>

        {participants.some((p) => p.diet === "vegetarien") && (
          <div className="card !border-emerald-200 !bg-emerald-50">
            <p className="text-sm font-bold text-emerald-800">
              🥦 Végétarien{participants.filter((p) => p.diet === "vegetarien").length > 1 ? "s" : ""} :{" "}
              {participants
                .filter((p) => p.diet === "vegetarien")
                .map((p) => p.name)
                .join(", ")}{" "}
              — pensez-y pour vos plats !
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="font-black text-slate-700">📅 Le planning des fourneaux</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {meals.map((m) => (
              <li key={m.id} className="flex items-baseline gap-2">
                <span className="w-20 shrink-0 whitespace-nowrap font-black text-ocean-700">
                  {formatDayShort(m.day)} {m.slot === "midi" ? "☀️" : "🌙"}
                </span>
                <span className="font-semibold text-slate-600">
                  {groupById.get(m.group_id) ? groupFirstNames(m.group_id) : "?"}
                  {m.title?.trim() ? ` — ${m.title}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function CommonItemsCard({
  items,
  readOnly,
  onToggle,
  onChange,
}: {
  items: MealItem[];
  readOnly: boolean;
  onToggle: (item: MealItem) => void;
  onChange: () => void;
}) {
  const [newItem, setNewItem] = useState("");

  async function addItem() {
    const label = newItem.trim();
    if (!label || readOnly) return;
    setNewItem("");
    const position = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { error } = await supabase.from("meal_items").insert({ meal_id: null, label, position });
    if (error) alert(error.message);
    onChange();
  }

  async function deleteItem(item: MealItem) {
    await supabase.from("meal_items").delete().eq("id", item.id);
    onChange();
  }

  return (
    <div className="card !border-sand-200 !bg-sand-50">
      <h2 className="font-black text-slate-800">🧺 Courses communes</h2>
      <p className="text-xs font-bold text-slate-400">Pour toute la maison : café, huile, PQ…</p>
      {items.length === 0 && (
        <p className="mt-2 text-sm font-semibold text-slate-300">Rien pour l&apos;instant.</p>
      )}
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            movedOut={item.run !== null}
            onToggle={() => onToggle(item)}
            onDelete={readOnly ? undefined : () => deleteItem(item)}
          />
        ))}
      </ul>
      {!readOnly && (
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ajouter un truc commun…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            maxLength={120}
          />
          <button onClick={addItem} disabled={!newItem.trim()} className="btn-primary shrink-0">
            ➕
          </button>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mx-4">
      <button onClick={onClick} className="text-sm font-black text-ocean-600">
        ← Retour aux repas
      </button>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onDelete,
  movedOut = false,
}: {
  item: MealItem;
  onToggle: () => void;
  onDelete?: () => void;
  movedOut?: boolean;
}) {
  if (movedOut) {
    // Reporté dans la liste triée : vraiment rayé ici, se gère là-bas
    return (
      <li className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-start gap-2 py-1">
          <span className="mt-0.5 w-5 shrink-0 text-center text-xs">🧾</span>
          <span className="min-w-0 break-words text-sm font-semibold text-slate-300 line-through">
            {item.label}
          </span>
        </span>
        {onDelete && (
          <button onClick={onDelete} aria-label="Supprimer l'ingrédient" className="shrink-0 px-2 py-1 font-bold text-slate-400 active:scale-90 transition">
            ✕
          </button>
        )}
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2">
      <button onClick={onToggle} className="flex min-w-0 flex-1 items-start gap-2 py-1 text-left">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
            item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
          }`}
        >
          {item.checked ? "✓" : ""}
        </span>
        <span className={`min-w-0 break-words text-sm font-semibold ${item.checked ? "text-slate-300 line-through" : "text-slate-600"}`}>
          {item.label}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Supprimer l'ingrédient"
          className="shrink-0 px-2 py-1 font-bold text-slate-400 active:scale-90 transition"
        >
          ✕
        </button>
      )}
    </li>
  );
}

function MealPlanner({
  meal,
  items,
  onMealChange,
  onItemsChange,
  onToggle,
}: {
  meal: Meal;
  items: MealItem[];
  onMealChange: () => void;
  onItemsChange: () => void;
  onToggle: (item: MealItem) => void;
}) {
  const [title, setTitle] = useState(meal.title ?? "");
  const [newItem, setNewItem] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveTitle() {
    setBusy(true);
    const { error } = await supabase.from("meals").update({ title: title.trim() || null }).eq("id", meal.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    onMealChange();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addItem() {
    const label = newItem.trim();
    if (!label) return;
    setNewItem("");
    const position = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 0;
    const { error } = await supabase.from("meal_items").insert({ meal_id: meal.id, label, position });
    if (error) alert(error.message);
    onItemsChange();
  }

  async function deleteItem(item: MealItem) {
    await supabase.from("meal_items").delete().eq("id", item.id);
    onItemsChange();
  }

  return (
    <section className="mx-4 mt-3 space-y-4">
      <div className="card !bg-ocean-50">
        <p className="font-black text-ocean-800">
          📅 {SLOT_LABEL[meal.slot]} · {formatDayLong(meal.day)}
        </p>
      </div>

      <div className="card">
        <label className="block text-sm font-bold text-slate-600">
          Nom du plat (affiché dans le planning)
          <input
            className="input mt-1"
            placeholder="Ex : tacos maison, salade géante…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
          />
        </label>
        <button onClick={saveTitle} disabled={busy} className="btn-primary mt-3 w-full">
          {saved ? "✅ Enregistré !" : busy ? "…" : "Enregistrer le plat"}
        </button>
      </div>

      <div className="card">
        <h2 className="font-black text-slate-700">🛒 Liste de courses</h2>
        {items.length === 0 && (
          <p className="mt-1 text-sm font-semibold text-slate-300">Ajoute les ingrédients ici.</p>
        )}
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              movedOut={item.run !== null}
              onToggle={() => onToggle(item)}
              onDelete={() => deleteItem(item)}
            />
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ajouter un ingrédient…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            maxLength={120}
          />
          <button onClick={addItem} disabled={!newItem.trim()} className="btn-primary shrink-0">
            ➕
          </button>
        </div>
      </div>
    </section>
  );
}
