import { DEFAULT_SETTINGS, STORAGE_KEY } from "../constants";
import type { Settings } from "../types/checkIt";

export type PersistedV1 = {
  v: 1;
  settings: Settings;
  isRunning: boolean;
  pendingRemindersIso: string[];
  currentVideoIndex: number;
  lastReminderTimeIso: string | null;
  notifyEnabled: boolean;
};

export function readPersistedState(): PersistedV1 | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as PersistedV1;
    if (data.v !== 1) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writePersistedState(snapshot: PersistedV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function mergeSettingsFromPersist(partial?: Partial<Settings>): Settings {
  if (!partial) {
    return DEFAULT_SETTINGS;
  }
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    intervalMinutes: String(
      partial.intervalMinutes ?? DEFAULT_SETTINGS.intervalMinutes,
    ),
  };
}

export const INITIAL_PERSISTED = readPersistedState();
