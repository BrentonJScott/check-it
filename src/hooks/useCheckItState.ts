import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { INTERVAL_OPTIONS, RING_CIRCUMFERENCE } from "../constants";
import { POSTURE_VIDEO_CLIPS, nextVideoIndex } from "../data/postureVideos";
import { AlertSoundSession } from "../lib/alertSoundSession";
import { formatCountdown } from "../lib/formatCountdown";
import {
  INITIAL_PERSISTED,
  mergeSettingsFromPersist,
  writePersistedState,
} from "../lib/persistence";
import { tryShowPostureCheckNotification } from "../lib/postureNotification";
import { createUpcomingReminderSchedule } from "../lib/reminderSchedule";
import type {
  NotificationPermissionState,
  PostureVideoClip,
  Settings,
} from "../types/checkIt";

export function useCheckItState() {
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

  const permissionRef = useRef(permissionStatus);
  permissionRef.current = permissionStatus;
  const notifyEnabledRef = useRef(notifyEnabled);
  notifyEnabledRef.current = notifyEnabled;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Date[]>([]);
  const soundRef = useRef(new AlertSoundSession());
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
    soundRef.current.stopRepeating();
    queueRef.current = [];
    setUpcomingCount(0);
    setNextReminderAt(null);
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    setIsRunning(false);
  }

  function stopRepeatingAlertSound() {
    soundRef.current.stopRepeating();
  }

  function startRepeatingAlertSound() {
    soundRef.current.startRepeating();
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

    tryShowPostureCheckNotification(
      permissionRef.current,
      notifyEnabledRef.current,
    );
  }

  function acknowledgeReminder() {
    void soundRef.current.unlock();
    stopRepeatingAlertSound();
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    scheduleNextReminder();
  }

  function handleStart() {
    const queueWasRefreshed = refreshQueueForUpcomingWindow(new Date());
    if (!queueWasRefreshed) {
      return;
    }

    void soundRef.current.unlock();

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
      void soundRef.current.unlock();
      setNotifyEnabled((prev) => !prev);
      return;
    }

    if (Notification.permission === "denied") {
      return;
    }

    void Notification.requestPermission().then((permission) => {
      setPermissionStatus(permission);
      if (permission === "granted") {
        void soundRef.current.unlock();
        setNotifyEnabled(true);
      }
    });
  }

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        soundRef.current.resumeFromUserGesture();
      }
    }
    function onPointerDown() {
      soundRef.current.resumeFromUserGesture();
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
    startTransition(() => {
      setNowTick(Date.now());
      setIsRunning(true);
    });
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
    const sound = soundRef.current;
    return () => {
      clearActiveTimer();
      sound.dispose();
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

  return {
    settings,
    setSettings,
    permissionStatus,
    notifyEnabled,
    isRunning,
    upcomingCount,
    intervalSelectValue,
    activeVideo,
    countdownLabel,
    ringDashOffset,
    isAlertDialogOpen,
    activeReminderLabel,
    nextReminderAt,
    heroButtonDisabled,
    heroButtonLabel,
    heroButtonClass,
    acknowledgeReminder,
    handleStart,
    handleNotificationHeroClick,
    stopReminders,
  };
}
