import type { Settings } from "../types/checkIt";

/**
 * Which wellness experience the user is viewing.
 * Add new string literals here when you introduce another reminder type.
 */
export type WellnessTrack = "posture" | "water";

/** Posture reminder state saved to localStorage (subset of full app state). */
export type PosturePersistSlice = {
  isRunning: boolean;
  pendingRemindersIso: string[];
  currentVideoIndex: number;
  lastReminderTimeIso: string | null;
};

/** Water tracking + reminder state saved to localStorage. */
export type WaterPersistSlice = {
  isRunning: boolean;
  pendingRemindersIso: string[];
  consumedMl: number;
  dailyGoalMl: number;
  /** Local calendar day (`YYYY-MM-DD`) that `consumedMl` belongs to. */
  consumptionDay: string;
};

/** Current storage format (version 2). */
export type WellnessPersistV2 = {
  v: 2;
  activeTrack: WellnessTrack;
  notifyEnabled: boolean;
  /** Shared “active hours” + interval used by posture and water schedules. */
  dayPacing: Settings;
  posture: PosturePersistSlice;
  water: WaterPersistSlice;
};

/** Legacy format from early versions of the app — migrated once on read. */
export type WellnessPersistV1 = {
  v: 1;
  settings: Settings;
  isRunning: boolean;
  pendingRemindersIso: string[];
  currentVideoIndex: number;
  lastReminderTimeIso: string | null;
  notifyEnabled: boolean;
};
