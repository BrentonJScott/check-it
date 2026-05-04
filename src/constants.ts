import type { Settings } from "./types/checkIt";

export const DEFAULT_SETTINGS: Settings = {
  startTime: "08:00",
  endTime: "16:00",
  intervalMinutes: "30",
};

export const INTERVAL_OPTIONS = [15, 20, 30, 45, 60] as const;

export const RING_RADIUS = 54;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const STORAGE_KEY = "check-it-state";

/** Browser notification tag so posture alerts replace each other instead of stacking. */
export const POSTURE_NOTIFICATION_TAG = "check-it-posture";

/** Separate tag for hydration reminders. */
export const WATER_NOTIFICATION_TAG = "check-it-water";
