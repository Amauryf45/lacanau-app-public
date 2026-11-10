"use client";

import useSWR from "swr";
import { supabase } from "./supabase";
import type {
  Activity,
  ActivityInterest,
  Completion,
  CompletionVote,
  DailyCompletion,
  Dare,
  DareVote,
  KillerMe,
  KillerPublic,
  LeaderboardRow,
  Meal,
  MealGroup,
  MealGroupMember,
  MealItem,
  Message,
  MessageReaction,
  NoteReaction,
  Participant,
  Photo,
  PhotoComment,
  PhotoReaction,
  Poll,
  PollOption,
  PollVote,
  PublicNote,
  Quest,
} from "./types";

const REFRESH = { refreshInterval: 15000, revalidateOnFocus: true };

async function q<T>(builder: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data as T;
}

export function useParticipants() {
  return useSWR<Participant[]>(
    "participants",
    () => q(supabase.from("participants").select("*").order("name")),
    REFRESH
  );
}

export function useLeaderboard() {
  return useSWR<LeaderboardRow[]>(
    "leaderboard",
    () => q(supabase.from("leaderboard").select("*").order("points", { ascending: false })),
    REFRESH
  );
}

export function useQuests() {
  return useSWR<Quest[]>(
    "quests",
    () => q(supabase.from("quests").select("*").eq("active", true).order("created_at")),
    REFRESH
  );
}

/** Toutes les quêtes, y compris désactivées (pour les palmarès). */
export function useAllQuests() {
  return useSWR<Quest[]>(
    "quests_all",
    () => q(supabase.from("quests").select("*").order("created_at")),
    REFRESH
  );
}

export function useCompletions() {
  return useSWR<Completion[]>(
    "completions",
    () => q(supabase.from("completions").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function useCompletionVotes() {
  return useSWR<CompletionVote[]>(
    "completion_votes",
    () => q(supabase.from("completion_votes").select("*")),
    REFRESH
  );
}

export function useDailyCompletions() {
  return useSWR<DailyCompletion[]>(
    "daily_completions",
    () => q(supabase.from("daily_completions").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function useDares() {
  return useSWR<Dare[]>(
    "dares",
    () => q(supabase.from("dares").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function useDareVotes() {
  return useSWR<DareVote[]>("dare_votes", () => q(supabase.from("dare_votes").select("*")), REFRESH);
}

export function useNotes() {
  return useSWR<PublicNote[]>(
    "notes_public",
    () => q(supabase.from("notes_public").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function useNoteReactions() {
  return useSWR<NoteReaction[]>(
    "note_reactions",
    () => q(supabase.from("note_reactions").select("*")),
    REFRESH
  );
}

export function usePolls() {
  return useSWR<Poll[]>(
    "polls",
    () => q(supabase.from("polls").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function usePollOptions() {
  return useSWR<PollOption[]>(
    "poll_options",
    () => q(supabase.from("poll_options").select("*").order("position")),
    REFRESH
  );
}

export function usePollVotes() {
  return useSWR<PollVote[]>("poll_votes", () => q(supabase.from("poll_votes").select("*")), REFRESH);
}

export function useActivities() {
  return useSWR<Activity[]>(
    "activities",
    () => q(supabase.from("activities").select("*").order("day", { ascending: true, nullsFirst: false }).order("start_time")),
    REFRESH
  );
}

export function useActivityInterest() {
  return useSWR<ActivityInterest[]>(
    "activity_interest",
    () => q(supabase.from("activity_interest").select("*")),
    REFRESH
  );
}

export function useKillerPublic() {
  return useSWR<KillerPublic[]>(
    "killer_public",
    () => q(supabase.from("killer_public").select("*")),
    { refreshInterval: 8000, revalidateOnFocus: true }
  );
}

export function useKillerMe(myId: string | null) {
  return useSWR<KillerMe | null>(
    myId ? `killer_me:${myId}` : null,
    async () => {
      const { data, error } = await supabase.rpc("killer_me", { p_me: myId });
      if (error) throw new Error(error.message);
      return data as KillerMe | null;
    },
    { refreshInterval: 8000, revalidateOnFocus: true }
  );
}

export function useMealGroups() {
  return useSWR<MealGroup[]>(
    "meal_groups",
    () => q(supabase.from("meal_groups").select("*").order("position")),
    REFRESH
  );
}

export function useMealGroupMembers() {
  return useSWR<MealGroupMember[]>(
    "meal_group_members",
    () => q(supabase.from("meal_group_members").select("*")),
    REFRESH
  );
}

export function useMeals() {
  return useSWR<Meal[]>(
    "meals",
    () => q(supabase.from("meals").select("*").order("day").order("slot")),
    REFRESH
  );
}

export function useMealItems() {
  return useSWR<MealItem[]>(
    "meal_items",
    () => q(supabase.from("meal_items").select("*").order("position").order("created_at")),
    REFRESH
  );
}

export function useMessages() {
  return useSWR<Message[]>(
    "messages",
    () => q(supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(500)),
    { refreshInterval: 4000, revalidateOnFocus: true }
  );
}

export function useMessageReactions() {
  return useSWR<MessageReaction[]>(
    "message_reactions",
    () => q(supabase.from("message_reactions").select("*")),
    { refreshInterval: 4000, revalidateOnFocus: true }
  );
}

export function usePhotos() {
  return useSWR<Photo[]>(
    "photos",
    () => q(supabase.from("photos").select("*").order("created_at", { ascending: false })),
    REFRESH
  );
}

export function usePhotoComments() {
  return useSWR<PhotoComment[]>(
    "photo_comments",
    () => q(supabase.from("photo_comments").select("*").order("created_at")),
    REFRESH
  );
}

export function usePhotoReactions() {
  return useSWR<PhotoReaction[]>(
    "photo_reactions",
    () => q(supabase.from("photo_reactions").select("*")),
    REFRESH
  );
}
