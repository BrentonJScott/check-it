import { DEFAULT_SETTINGS, STORAGE_KEY } from "../constants";
import type { Settings } from "../types/checkIt";
import type {
  WellnessPersistV1,
  WellnessPersistV2,
  WellnessPersistV3,
} from "./wellnessTypes";

export function mergeDayPacingSettings(partial?: Partial<Settings>): Settings {
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

function migrateV1ToV2(legacy: WellnessPersistV1): WellnessPersistV2 {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const consumptionDay = `${y}-${m}-${d}`;

  return {
    v: 2,
    activeTrack: "posture",
    notifyEnabled: legacy.notifyEnabled,
    dayPacing: legacy.settings,
    posture: {
      isRunning: legacy.isRunning,
      pendingRemindersIso: legacy.pendingRemindersIso ?? [],
      currentVideoIndex: legacy.currentVideoIndex,
      lastReminderTimeIso: legacy.lastReminderTimeIso,
    },
    water: {
      isRunning: false,
      pendingRemindersIso: [],
      consumedMl: 0,
      dailyGoalMl: 2000,
      consumptionDay,
    },
  };
}

function defaultV2(): WellnessPersistV2 {
  const today = new Date();
  const y = today.getFullYear();
  const mo = String(today.getMonth() + 1).padStart(2, "0");
  const da = String(today.getDate()).padStart(2, "0");
  const consumptionDay = `${y}-${mo}-${da}`;

  return {
    v: 2,
    activeTrack: "posture",
    notifyEnabled: true,
    dayPacing: DEFAULT_SETTINGS,
    posture: {
      isRunning: false,
      pendingRemindersIso: [],
      currentVideoIndex: 0,
      lastReminderTimeIso: null,
    },
    water: {
      isRunning: false,
      pendingRemindersIso: [],
      consumedMl: 0,
      dailyGoalMl: 2000,
      consumptionDay,
    },
  };
}

function migrateV2ToV3(v2: WellnessPersistV2): WellnessPersistV3 {
  const pacing = mergeDayPacingSettings(v2.dayPacing);
  return {
    v: 3,
    activeTrack: v2.activeTrack,
    notifyEnabled: v2.notifyEnabled,
    posturePacing: { ...pacing },
    waterPacing: { ...pacing },
    posture: { ...v2.posture },
    water: { ...v2.water },
  };
}

function defaultV3(): WellnessPersistV3 {
  const v2 = defaultV2();
  const pacing = mergeDayPacingSettings(v2.dayPacing);
  return {
    v: 3,
    activeTrack: v2.activeTrack,
    notifyEnabled: v2.notifyEnabled,
    posturePacing: pacing,
    waterPacing: { ...pacing },
    posture: v2.posture,
    water: v2.water,
  };
}

export function readWellnessPersist(): WellnessPersistV3 {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultV3();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultV3();
    }
    const data = JSON.parse(raw) as
      | WellnessPersistV1
      | WellnessPersistV2
      | WellnessPersistV3;
    if (data.v === 3) {
      const base = defaultV3();
      return {
        ...base,
        ...data,
        posturePacing: mergeDayPacingSettings(data.posturePacing),
        waterPacing: mergeDayPacingSettings(data.waterPacing),
        posture: { ...base.posture, ...data.posture },
        water: { ...base.water, ...data.water },
      };
    }
    if (data.v === 2) {
      const base = defaultV2();
      const merged: WellnessPersistV2 = {
        ...base,
        ...data,
        dayPacing: mergeDayPacingSettings(data.dayPacing),
        posture: { ...base.posture, ...data.posture },
        water: { ...base.water, ...data.water },
      };
      return migrateV2ToV3(merged);
    }
    if (data.v === 1) {
      return migrateV2ToV3(migrateV1ToV2(data));
    }
  } catch {
    // ignore
  }
  return defaultV3();
}

export function writeWellnessPersist(snapshot: WellnessPersistV3): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or private mode — ignore.
  }
}

export const INITIAL_WELLNESS = readWellnessPersist();
