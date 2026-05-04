import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RING_CIRCUMFERENCE } from "../constants";
import { POSTURE_VIDEO_CLIPS, nextVideoIndex } from "../data/postureVideos";
import { AlertSoundSession } from "../lib/alertSoundSession";
import { formatCountdown } from "../lib/formatCountdown";
import { tryShowPostureCheckNotification } from "../lib/postureNotification";
import { createUpcomingReminderSchedule } from "../lib/reminderSchedule";
import type {
  NotificationPermissionState,
  PostureVideoClip,
  Settings,
} from "../types/checkIt";
import type { PosturePersistSlice } from "./wellnessTypes";
import { collectPendingReminderIso } from "./reminderPersistUtils";

type PermissionGetter = () => NotificationPermissionState;
type NotifyGetter = () => boolean;

export type UsePostureReminderEngineArgs = {
  settings: Settings;
  initial: PosturePersistSlice;
  getPermission: PermissionGetter;
  getNotifyEnabled: NotifyGetter;
};

/**
 * Posture reminders: countdown ring, queue inside the active window, dialog + sound.
 * Persistence is handled by the parent `useWellnessApp` hook.
 */
export function usePostureReminderEngine({
  settings,
  initial,
  getPermission,
  getNotifyEnabled,
}: UsePostureReminderEngineArgs) {
  const [isRunning, setIsRunning] = useState(initial.isRunning);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(
    initial.currentVideoIndex,
  );
  const [lastReminderTime, setLastReminderTime] = useState<Date | null>(() => {
    const iso = initial.lastReminderTimeIso;
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
  const soundRef = useRef(new AlertSoundSession());

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

    tryShowPostureCheckNotification(getPermission(), getNotifyEnabled());
  }

  function acknowledgeReminder() {
    void soundRef.current.unlock();
    soundRef.current.stopRepeating();
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

  useLayoutEffect(() => {
    if (!initial.isRunning || !initial.pendingRemindersIso?.length) {
      return;
    }
    const dates = initial.pendingRemindersIso
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

  const buildPosturePersistSlice = useCallback((): PosturePersistSlice => {
    return {
      isRunning,
      pendingRemindersIso: collectPendingReminderIso(
        nextReminderAt,
        queueRef.current,
      ),
      currentVideoIndex,
      lastReminderTimeIso: lastReminderTime?.toISOString() ?? null,
    };
  }, [isRunning, nextReminderAt, currentVideoIndex, lastReminderTime]);

  return {
    isRunning,
    upcomingCount,
    currentVideoIndex,
    lastReminderTime,
    activeVideo,
    countdownLabel,
    ringDashOffset,
    isAlertDialogOpen,
    activeReminderLabel,
    nextReminderAt,
    acknowledgeReminder,
    handleStart,
    stopReminders,
    buildPosturePersistSlice,
    unlockAudioForUserGesture: () => soundRef.current.unlock(),
    resumeAudioIfPossible: () => soundRef.current.resumeFromUserGesture(),
  };
}
