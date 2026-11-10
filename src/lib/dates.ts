/** Semaine du séjour : samedi 8 août → samedi 15 août 2026. */
export const TRIP_START = new Date(2026, 7, 8);
export const TRIP_END = new Date(2026, 7, 15);

export const TRIP_DAYS: string[] = Array.from({ length: 8 }, (_, i) => {
  const d = new Date(2026, 7, 8 + i);
  return toISODate(d);
});

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatDayLong(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatDayShort(iso: string): string {
  const d = parseISODate(iso);
  return `${DAY_NAMES[d.getDay()].slice(0, 3)}. ${d.getDate()}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h}h${m === "00" ? "" : m}`;
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

/** Position dans le séjour : avant / pendant (jour N) / après. */
export function tripStatus(now = new Date()): { phase: "avant" | "pendant" | "apres"; day: number } {
  const today = toISODate(now);
  if (today < TRIP_DAYS[0]) {
    const diff = Math.ceil((parseISODate(TRIP_DAYS[0]).getTime() - now.getTime()) / 86400000);
    return { phase: "avant", day: diff };
  }
  if (today > TRIP_DAYS[TRIP_DAYS.length - 1]) return { phase: "apres", day: 0 };
  return { phase: "pendant", day: TRIP_DAYS.indexOf(today) + 1 };
}
