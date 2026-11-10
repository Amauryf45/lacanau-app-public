export type Diet = "vegetarien" | "omnivore";

export type Participant = {
  id: string;
  name: string;
  nickname: string | null;
  emoji: string;
  joker_used: boolean;
  diet: Diet | null;
  restricted: boolean;
  restricted_reason: string | null;
  restricted_at: string | null;
};

export type QuestLevel = "soft" | "fun" | "epice" | "perso";

export type Quest = {
  id: string;
  title: string;
  description: string | null;
  level: QuestLevel;
  points: number;
  created_by: string | null;
  active: boolean;
  created_at: string;
};

export type CompletionStatus = "pending" | "validated" | "rejected";

export type Completion = {
  id: string;
  quest_id: string;
  participant_id: string;
  proof_text: string | null;
  proof_photo_url: string | null;
  status: CompletionStatus;
  created_at: string;
};

export type CompletionVote = {
  id: string;
  completion_id: string;
  voter_id: string;
  approve: boolean;
};

export type DareStatus =
  | "proposed"
  | "accepted"
  | "refused"
  | "proof_submitted"
  | "validated"
  | "rejected";

export type Dare = {
  id: string;
  challenger_id: string;
  target_id: string;
  title: string;
  description: string | null;
  points: number;
  status: DareStatus;
  proof_text: string | null;
  proof_photo_url: string | null;
  created_at: string;
};

export type DareVote = {
  id: string;
  dare_id: string;
  voter_id: string;
  approve: boolean;
};

export type PublicNote = {
  id: string;
  content: string;
  created_at: string;
  revealed: boolean;
  revealed_by_name: string | null;
  revealed_author_name: string | null;
};

export type NoteReaction = {
  id: string;
  note_id: string;
  participant_id: string;
  emoji: string;
};

export type Poll = {
  id: string;
  question: string;
  created_by: string;
  closed: boolean;
  created_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

export type PollVote = {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
};

export type ActivityStatus = "proposed" | "confirmed" | "cancelled";

export type Activity = {
  id: string;
  title: string;
  description: string | null;
  proposed_by: string | null;
  day: string | null;
  start_time: string | null;
  location: string | null;
  status: ActivityStatus;
  created_at: string;
};

export type ActivityInterest = {
  id: string;
  activity_id: string;
  participant_id: string;
  going: boolean;
};

export type Photo = {
  id: string;
  url: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type PhotoComment = {
  id: string;
  photo_id: string;
  participant_id: string;
  content: string;
  created_at: string;
};

export type PhotoReaction = {
  id: string;
  photo_id: string;
  participant_id: string;
  emoji: string;
};

export type Message = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  participant_id: string;
  emoji: string;
};

export type KillerPublic = {
  participant_id: string;
  alive: boolean;
  kills: number;
  killed_at: string | null;
  death_mission: string | null;
};

export type KillerMe = {
  alive: boolean;
  kills: number;
  death_mission: string | null;
  refused: boolean;
  pending_confirm: boolean;
  mission: string | null;
  target_id: string | null;
  target_name: string | null;
  target_emoji: string | null;
  target_pending: boolean;
};

export type KillerHistoryRow = {
  killer_name: string;
  victim_name: string;
  mission: string;
  happened_at: string;
};

export type MealGroup = {
  id: string;
  name: string;
  position: number;
};

export type MealGroupMember = {
  group_id: string;
  participant_id: string;
};

export type MealSlot = "midi" | "soir";

export type Meal = {
  id: string;
  group_id: string;
  day: string;
  slot: MealSlot;
  title: string | null;
};

export type MealItem = {
  id: string;
  /** null = course commune, hors plat */
  meal_id: string | null;
  label: string;
  checked: boolean;
  position: number;
  /** numéro de course dans laquelle l'item a été reporté (null = pas encore) */
  run: number | null;
  category: string | null;
  created_at: string;
};

export const SHOPPING_CATEGORIES: [string, string][] = [
  ["legumes", "🥬 Fruits & Légumes"],
  ["viande", "🥩 Viande & Poisson"],
  ["frais", "🧀 Frais & Crèmerie"],
  ["epicerie", "🥫 Épicerie"],
  ["boulangerie", "🍞 Boulangerie"],
  ["boissons", "🥤 Boissons"],
  ["maison", "🧻 Hygiène & Maison"],
  ["autre", "📦 Autre"],
];

export type LeaderboardRow = {
  id: string;
  name: string;
  nickname: string | null;
  emoji: string;
  points: number;
};

export type DailyCompletion = {
  id: string;
  participant_id: string;
  day: string;
  status: CompletionStatus;
  created_at: string;
};

/** Drive partagé pour les vidéos du vlog de la semaine (variable NEXT_PUBLIC_VLOG_DRIVE_URL). */
export const VLOG_DRIVE_URL = process.env.NEXT_PUBLIC_VLOG_DRIVE_URL ?? "#";

export const DAILY_QUEST_POINTS = 5;

/** Tricount de la semaine (variable NEXT_PUBLIC_TRICOUNT_URL). */
export const TRICOUNT_URL = process.env.NEXT_PUBLIC_TRICOUNT_URL ?? "#";

export const AVATAR_EMOJIS = [
  "🏄", "🌞", "🍻", "🌊", "🦩", "🐚", "🔥", "🍉", "🎣", "🏐", "🌴", "🍹", "🎸",
  "🐬", "🦀", "⛱️", "🥥", "🍦", "🤿", "🛶", "🎳", "🕶️", "🧜", "🦈",
];

export const LEVEL_LABELS: Record<QuestLevel, string> = {
  soft: "Soft",
  fun: "Fun",
  epice: "Épicé",
  perso: "Défi perso",
};

export const LEVEL_COLORS: Record<QuestLevel, string> = {
  soft: "bg-emerald-100 text-emerald-700",
  fun: "bg-amber-100 text-amber-700",
  epice: "bg-rose-100 text-rose-700",
  perso: "bg-violet-100 text-violet-700",
};

export function displayName(p: Pick<Participant, "name" | "nickname">): string {
  return p.nickname?.trim() || p.name;
}

/** « Pseudo (Prénom) » quand un pseudo est défini, sinon juste le prénom. */
export function displayNameFull(p: Pick<Participant, "name" | "nickname">): string {
  const nick = p.nickname?.trim();
  return nick && nick !== p.name ? `${nick} (${p.name})` : p.name;
}
