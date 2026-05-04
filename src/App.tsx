import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Settings = {
  startTime: string;
  endTime: string;
  intervalMinutes: number | string;
};

type PostureVideoClip = {
  id: string;
  title: string;
  embedUrl: string;
};

type ScheduleSuccess = {
  error: null;
  reminders: Date[];
  dayStart: Date;
  dayEnd: Date;
};

type ScheduleFailure = {
  error: string;
  reminders: Date[];
};

type ScheduleResult = ScheduleSuccess | ScheduleFailure;

type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

const DEFAULT_SETTINGS: Settings = {
  startTime: "08:00",
  endTime: "16:00",
  intervalMinutes: "30",
};

const POSTURE_VIDEO_CLIPS: PostureVideoClip[] = [
  {
    id: "neck-reset",
    title: "Neck reset and shoulder release",
    embedUrl:
      "https://www.youtube.com/embed/Ef6LwAaB3_E?start=5&end=25&rel=0",
  },
  {
    id: "seated-t-spine",
    title: "Seated thoracic spine opener",
    embedUrl:
      "https://www.youtube.com/embed/2L2lnxIcNmo?start=0&end=20&rel=0",
  },
  {
    id: "desk-posture-reset",
    title: "Desk posture reset routine",
    embedUrl:
      "https://www.youtube.com/embed/c8SN8v9-SGk?start=8&end=30&rel=0",
  },
  {
    id: "scapular-activation",
    title: "Scapular activation quick drill",
    embedUrl:
      "https://www.youtube.com/embed/u0upTVw2bgU?start=6&end=22&rel=0",
  },
  {
    id: "core-bracing",
    title: "Core bracing posture drill",
    embedUrl:
      "https://www.youtube.com/embed/AnYl6Nk9GOA?start=3&end=18&rel=0",
  },
];

function parseTimeForDate(timeString: string, baseDate: Date): Date {
  const [hoursString, minutesString] = timeString.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function createUpcomingReminderSchedule(
  fromTime: Date,
  startTime: string,
  endTime: string,
  intervalMinutes: number | string,
): ScheduleResult {
  const intervalMs = Number(intervalMinutes) * 60 * 1000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return {
      error: "Interval must be a positive number of minutes.",
      reminders: [],
    };
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = new Date(fromTime);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);

    const dayStart = parseTimeForDate(startTime, day);
    const dayEnd = parseTimeForDate(endTime, day);

    if (dayEnd <= dayStart) {
      return {
        error: "End time must be after start time.",
        reminders: [],
      };
    }

    let baseTime: Date = dayStart;

    if (dayOffset === 0) {
      if (fromTime >= dayEnd) {
        continue;
      }

      baseTime = fromTime < dayStart ? dayStart : fromTime;
    }

    const firstReminder = new Date(baseTime.getTime() + intervalMs);
    if (firstReminder > dayEnd) {
      continue;
    }

    const reminders: Date[] = [];
    const cursor = new Date(firstReminder);

    while (cursor <= dayEnd) {
      reminders.push(new Date(cursor));
      cursor.setTime(cursor.getTime() + intervalMs);
    }

    return { error: null, reminders, dayStart, dayEnd };
  }

  return {
    error: "Unable to create upcoming reminders from these settings.",
    reminders: [],
  };
}

function nextVideoIndex(previousIndex: number): number {
  if (POSTURE_VIDEO_CLIPS.length <= 1) {
    return 0;
  }

  return (previousIndex + 1) % POSTURE_VIDEO_CLIPS.length;
}

function formatCountdown(milliseconds: number): string {
  const safeValue = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60] as const;

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const STORAGE_KEY = "check-it-state";

type PersistedV1 = {
  v: 1;
  settings: Settings;
  isRunning: boolean;
  pendingRemindersIso: string[];
  currentVideoIndex: number;
  lastReminderTimeIso: string | null;
  notifyEnabled: boolean;
};

function readPersistedState(): PersistedV1 | null {
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

function writePersistedState(snapshot: PersistedV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or private mode — ignore.
  }
}

function mergeSettingsFromPersist(partial?: Partial<Settings>): Settings {
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

const INITIAL_PERSISTED = readPersistedState();

function getAudioContextConstructor():
  | (new () => AudioContext)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  if (typeof window.AudioContext !== "undefined") {
    return window.AudioContext;
  }
  const legacy = (
    window as unknown as { webkitAudioContext?: new () => AudioContext }
  ).webkitAudioContext;
  return legacy;
}

let cachedBeepObjectUrl: string | null = null;

/** Short PCM WAV for `<audio>` fallback when Web Audio is blocked in a background tab. */
function buildBeepWavBlob(): Blob {
  const sampleRate = 22050;
  const durationSec = 0.22;
  const frequency = 880;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  }

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * 2, true);
  offset += 4;
  view.setUint16(offset, 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const fade = 1 - i / numSamples;
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.35 * fade;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(
      offset,
      Math.max(-32768, Math.min(32767, Math.round(clipped * 32767))),
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function playHtmlAudioBeep(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!cachedBeepObjectUrl) {
      cachedBeepObjectUrl = URL.createObjectURL(buildBeepWavBlob());
    }
    const audio = new Audio(cachedBeepObjectUrl);
    audio.volume = 0.45;
    void audio.play().catch(() => {});
  } catch {
    // Ignore playback failures (autoplay policy, etc.).
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() =>
    mergeSettingsFromPersist(INITIAL_PERSISTED?.settings),
  );
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionState>(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission,
    );
  const [notifyEnabled, setNotifyEnabled] = useState(
    () => INITIAL_PERSISTED?.notifyEnabled !== false,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(() => {
    const raw = INITIAL_PERSISTED?.currentVideoIndex;
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return 0;
    }
    return Math.min(
      POSTURE_VIDEO_CLIPS.length - 1,
      Math.max(0, Math.floor(raw)),
    );
  });
  const [lastReminderTime, setLastReminderTime] = useState<Date | null>(() => {
    const iso = INITIAL_PERSISTED?.lastReminderTimeIso;
    if (!iso) {
      return null;
    }
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });
  const [nextReminderAt, setNextReminderAt] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [activeReminderLabel, setActiveReminderLabel] = useState("");

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Date[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const repeatingSoundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const skipNextPersistRef = useRef(true);

  const activeVideo = useMemo(
    () => POSTURE_VIDEO_CLIPS[currentVideoIndex] as PostureVideoClip,
    [currentVideoIndex],
  );
  const countdownLabel = useMemo(() => {
    if (!isRunning || !nextReminderAt) {
      return "--:--";
    }

    return formatCountdown(nextReminderAt.getTime() - nowTick);
  }, [isRunning, nextReminderAt, nowTick]);

  const intervalMs = useMemo(() => {
    const minutes = Number(settings.intervalMinutes);
    return Math.max(1, Number.isFinite(minutes) ? minutes : 30) * 60 * 1000;
  }, [settings.intervalMinutes]);

  const ringProgress = useMemo(() => {
    if (!isRunning || !nextReminderAt) {
      return 0;
    }
    const remaining = Math.max(0, nextReminderAt.getTime() - nowTick);
    return Math.min(1, Math.max(0, 1 - remaining / intervalMs));
  }, [isRunning, nextReminderAt, nowTick, intervalMs]);

  const ringDashOffset = RING_CIRCUMFERENCE * (1 - ringProgress);

  const intervalMinutesNum = Number(settings.intervalMinutes);
  const intervalSelectValue =
    Number.isFinite(intervalMinutesNum) &&
    (INTERVAL_OPTIONS as readonly number[]).includes(intervalMinutesNum)
      ? String(intervalMinutesNum)
      : "30";

  function clearActiveTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopReminders() {
    clearActiveTimer();
    stopRepeatingAlertSound();
    queueRef.current = [];
    setUpcomingCount(0);
    setNextReminderAt(null);
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    setIsRunning(false);
  }

  async function unlockWebAudio(): Promise<void> {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      return;
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    const ctx = audioContextRef.current;
    await ctx.resume().catch(() => {});
    if (ctx.state !== "running") {
      return;
    }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.00001;
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  }

  async function playAlertSound(): Promise<void> {
    const AudioContextClass = getAudioContextConstructor();
    if (!AudioContextClass) {
      playHtmlAudioBeep();
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    await context.resume().catch(() => {});

    if (context.state !== "running") {
      playHtmlAudioBeep();
      return;
    }

    try {
      const tones = [
        { frequency: 880, offset: 0 },
        { frequency: 660, offset: 0.2 },
      ];

      for (const { frequency, offset } of tones) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        const end = start + 0.14;

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(end);
      }
    } catch {
      playHtmlAudioBeep();
    }
  }

  function stopRepeatingAlertSound() {
    if (repeatingSoundIntervalRef.current !== null) {
      clearInterval(repeatingSoundIntervalRef.current);
      repeatingSoundIntervalRef.current = null;
    }
  }

  function startRepeatingAlertSound() {
    stopRepeatingAlertSound();
    void playAlertSound();
    repeatingSoundIntervalRef.current = setInterval(() => {
      void playAlertSound();
    }, 1200);
  }

  function scheduleNextReminder(): void {
    clearActiveTimer();

    if (queueRef.current.length === 0) {
      const queueWasRefreshed = refreshQueueForUpcomingWindow(new Date());
      if (!queueWasRefreshed) {
        return;
      }
    }

    const nextReminder = queueRef.current.shift();

    setNextReminderAt(nextReminder ?? null);
    setUpcomingCount(queueRef.current.length + (nextReminder ? 1 : 0));

    if (!nextReminder) {
      stopReminders();
      return;
    }

    const delay = nextReminder.getTime() - Date.now();

    if (delay <= 0) {
      triggerReminder(nextReminder);
      return;
    }

    timerRef.current = setTimeout(() => {
      triggerReminder(nextReminder);
    }, delay);
  }

  function acknowledgeReminder() {
    void unlockWebAudio();
    stopRepeatingAlertSound();
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    scheduleNextReminder();
  }

  function refreshQueueForUpcomingWindow(referenceTime: Date): boolean {
    const s = settingsRef.current;
    const result = createUpcomingReminderSchedule(
      referenceTime,
      s.startTime,
      s.endTime,
      s.intervalMinutes,
    );

    if (result.error !== null) {
      stopReminders();
      return false;
    }

    if (result.reminders.length === 0) {
      stopReminders();
      return false;
    }

    queueRef.current = result.reminders;

    return true;
  }

  function triggerReminder(triggerTime: Date) {
    setCurrentVideoIndex((previousIndex) => nextVideoIndex(previousIndex));
    setLastReminderTime(triggerTime);
    setNextReminderAt(null);
    setActiveReminderLabel(
      triggerTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    setIsAlertDialogOpen(true);
    startRepeatingAlertSound();

    if (permissionStatus === "granted" && notifyEnabled) {
      new Notification("Posture check", {
        body: "Time to reset your posture. Dismiss the reminder dialog to continue.",
        silent: false,
        tag: "check-it-posture",
      });
    }
  }

  function handleStart() {
    const queueWasRefreshed = refreshQueueForUpcomingWindow(new Date());
    if (!queueWasRefreshed) {
      return;
    }

    void unlockWebAudio();

    setLastReminderTime(null);
    setNowTick(Date.now());
    setIsRunning(true);
    scheduleNextReminder();
  }

  function handleNotificationHeroClick() {
    if (typeof Notification === "undefined") {
      setPermissionStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      void unlockWebAudio();
      setNotifyEnabled((prev) => !prev);
      return;
    }

    if (Notification.permission === "denied") {
      return;
    }

    void Notification.requestPermission().then((permission) => {
      setPermissionStatus(permission);
      if (permission === "granted") {
        void unlockWebAudio();
        setNotifyEnabled(true);
      }
    });
  }

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void audioContextRef.current?.resume().catch(() => {});
      }
    }
    function onPointerDown() {
      void audioContextRef.current?.resume().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerdown", onPointerDown, {
      capture: true,
      passive: true,
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
    };
  }, []);

  useLayoutEffect(() => {
    const p = INITIAL_PERSISTED;
    if (!p?.isRunning || !p.pendingRemindersIso?.length) {
      return;
    }
    const dates = p.pendingRemindersIso
      .map((iso) => new Date(iso))
      .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) {
      return;
    }
    queueRef.current = dates;
    setNowTick(Date.now());
    setIsRunning(true);
    scheduleNextReminder();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only restore
  }, []);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const now = Date.now();
    const pending: Date[] = [];
    if (nextReminderAt && nextReminderAt.getTime() > now) {
      pending.push(nextReminderAt);
    }
    for (const d of queueRef.current) {
      if (d.getTime() > now) {
        pending.push(d);
      }
    }
    pending.sort((a, b) => a.getTime() - b.getTime());
    writePersistedState({
      v: 1,
      settings,
      isRunning,
      pendingRemindersIso: pending.map((d) => d.toISOString()),
      currentVideoIndex,
      lastReminderTimeIso: lastReminderTime?.toISOString() ?? null,
      notifyEnabled,
    });
  }, [
    settings,
    isRunning,
    nextReminderAt,
    currentVideoIndex,
    lastReminderTime,
    notifyEnabled,
  ]);

  useEffect(() => {
    function syncPermission() {
      if (typeof Notification !== "undefined") {
        setPermissionStatus(Notification.permission);
      }
    }
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, []);

  useEffect(() => {
    if (!isRunning || !nextReminderAt) {
      return undefined;
    }

    const tickInterval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(tickInterval);
    };
  }, [isRunning, nextReminderAt]);

  useEffect(() => {
    return () => {
      clearActiveTimer();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      stopRepeatingAlertSound();
    };
  }, []);

  const notificationSupported = typeof Notification !== "undefined";
  const browserDenied = notificationSupported && permissionStatus === "denied";
  const heroButtonDisabled = !notificationSupported || browserDenied;
  const heroButtonLabel = !notificationSupported
    ? "Notifications unavailable"
    : browserDenied
      ? "Notifications blocked"
      : permissionStatus === "granted" && notifyEnabled
        ? "Mute browser reminders"
        : "Enable browser reminders";
  const heroButtonClass =
    permissionStatus === "granted" && notifyEnabled
      ? "btn--hero btn--hero-muted"
      : "btn--hero";

  return (
    <>
      {isAlertDialogOpen && (
        <div className="alert-overlay" role="alertdialog" aria-modal="true">
          <div className="alert-dialog">
            <h2>Posture check</h2>
            <p className="subtle">
              Your {activeReminderLabel} reminder is ready. Acknowledge this alert to
              stop the sound and continue the schedule.
            </p>
            <button
              className="btn btn--primary btn--block"
              onClick={acknowledgeReminder}
              type="button"
            >
              I checked my posture
            </button>
          </div>
        </div>
      )}

      <div className="page">
        <header className="site-header">
          <span className="logo">Check-it</span>
          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Settings (coming soon)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden={true}
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Account (coming soon)"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden={true}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </header>

        <div className="page__inner">
          <section className="hero-card" aria-labelledby="hero-heading">
            <div className="timer-ring-wrap">
              <svg viewBox="0 0 120 120" aria-hidden={true}>
                <circle className="timer-ring__track" cx="60" cy="60" r={RING_RADIUS} />
                <circle
                  className="timer-ring__progress"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringDashOffset}
                />
              </svg>
              <div className="timer-ring__center">
                <span className="timer-ring__value">{countdownLabel}</span>
                <span className="timer-ring__kicker">Next reminder</span>
              </div>
            </div>

            <h2 id="hero-heading" className="hero-title">
              Keep that form up!
            </h2>
            <p className="hero-sub">
              Take a deep breath. Your next guided stretch is just around the corner.
            </p>

            <button
              type="button"
              className={heroButtonClass}
              onClick={handleNotificationHeroClick}
              disabled={heroButtonDisabled}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden={true}
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {heroButtonLabel}
            </button>
          </section>

          <section className="pacing-section" aria-labelledby="pacing-title">
            <h2 id="pacing-title" className="pacing-section__title">
              How should we pace your day?
            </h2>
            <p className="pacing-section__sub">
              Set your active hours and the rhythm of your reminders.
            </p>

            <div className="pacing-fields">
              <div className="pacing-field">
                <div className="pacing-field__row" aria-hidden={true}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2" />
                  </svg>
                  <span className="pacing-field__label">Start time</span>
                </div>
                <input
                  type="time"
                  className="pacing-field__time"
                  value={settings.startTime}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      startTime: event.target.value,
                    }))
                  }
                  aria-label="Start time"
                />
              </div>

              <div className="pacing-field">
                <div className="pacing-field__row" aria-hidden={true}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  <span className="pacing-field__label">End time</span>
                </div>
                <input
                  type="time"
                  className="pacing-field__time"
                  value={settings.endTime}
                  onChange={(event) =>
                    setSettings((previous) => ({
                      ...previous,
                      endTime: event.target.value,
                    }))
                  }
                  aria-label="End time"
                />
              </div>

              <div className="pacing-field">
                <div className="pacing-field__row" aria-hidden={true}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="pacing-field__label">Interval</span>
                </div>
                <div className="pacing-field__value">
                  <select
                    className="pacing-field__select"
                    value={intervalSelectValue}
                    onChange={(event) =>
                      setSettings((previous) => ({
                        ...previous,
                        intervalMinutes: event.target.value,
                      }))
                    }
                    aria-label="Reminder interval"
                  >
                    {INTERVAL_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} mins
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pacing-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleStart}
                disabled={isRunning}
              >
                {isRunning ? "Reminders on" : "Start reminders"}
              </button>
              <button
                type="button"
                className="btn btn--tertiary"
                onClick={() => stopReminders()}
                disabled={!isRunning}
              >
                Stop
              </button>
            </div>

            <p className="pacing-meta">
              Browser permission: <strong>{permissionStatus}</strong>
              {" · "}
              App alerts:{" "}
              <strong>
                {permissionStatus === "granted"
                  ? notifyEnabled
                    ? "on"
                    : "muted"
                  : "—"}
              </strong>
              {isRunning ? (
                <>
                  {" "}
                  · Upcoming: <strong>{upcomingCount}</strong>
                  {nextReminderAt ? (
                    <>
                      {" "}
                      · Next at{" "}
                      <strong>
                        {nextReminderAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </strong>
                    </>
                  ) : null}
                </>
              ) : null}
            </p>
          </section>

          <section className="video-card" aria-labelledby="video-heading">
            <h2 id="video-heading">Guided stretch</h2>
            <p className="subtle">{activeVideo.title}</p>
            <div className="video-wrap">
              <iframe
                key={activeVideo.id}
                title={activeVideo.title}
                src={activeVideo.embedUrl}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>

          <div className="info-grid">
            <article className="info-card info-card--secondary">
              <h3 className="info-card__title">Daily consistency</h3>
              <p className="info-card__text">
                {isRunning
                  ? `${upcomingCount} posture check${upcomingCount === 1 ? "" : "s"} queued in your current window.`
                  : "Start reminders during your active hours to build a steady desk routine."}
              </p>
              <div className="info-card__icon" aria-hidden={true}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
            </article>
            <article className="info-card info-card--tertiary">
              <h3 className="info-card__title">Mindful moments</h3>
              <p className="info-card__text">
                {POSTURE_VIDEO_CLIPS.length}+ short clips, rotated each time you
                acknowledge a reminder.
              </p>
              <div className="info-card__icon" aria-hidden={true}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3c-1.2 4-4 5-7 5v11h14V8c-3 0-5.8-1-7-5z" />
                  <path d="M8 21v-6M16 21v-6" />
                </svg>
              </div>
            </article>
          </div>
        </div>

        <footer className="site-footer">
          <nav className="site-footer__links" aria-label="Footer">
            <a href="#">Privacy</a>
            <a
              href="https://github.com/BrentonJScott/check-it/issues"
              rel="noreferrer"
            >
              Help center
            </a>
            <a
              href="https://github.com/BrentonJScott/check-it#readme"
              rel="noreferrer"
            >
              Science
            </a>
          </nav>
          <p className="site-footer__copy">
            © {new Date().getFullYear()} Check-it · Posture reminders
          </p>
        </footer>
      </div>
    </>
  );
}
