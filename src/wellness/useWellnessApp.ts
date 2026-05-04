import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { INTERVAL_OPTIONS } from "../constants";
import type { NotificationPermissionState, Settings } from "../types/checkIt";
import type { WellnessTrack } from "./wellnessTypes";
import {
  INITIAL_WELLNESS,
  mergeDayPacingSettings,
  writeWellnessPersist,
} from "./wellnessPersistence";
import {
  activeWindowMinutes,
  alignConsumptionToDay,
  hydrationPercentDisplay,
  localDateKey,
  suggestedSipMl,
} from "./waterMath";
import { usePostureReminderEngine } from "./usePostureReminderEngine";
import { useWaterReminderEngine } from "./useWaterReminderEngine";

/**
 * Top-level wellness state: which track you are viewing, shared day schedule,
 * browser notifications, posture reminders, water intake, and water reminders.
 *
 * Persistence is written in one place so juniors can follow a single save path.
 */
export function useWellnessApp() {
  const skipNextPersistRef = useRef(true);

  const [activeTrack, setActiveTrack] = useState<WellnessTrack>(
    INITIAL_WELLNESS.activeTrack,
  );
  const [settings, setSettings] = useState<Settings>(() =>
    mergeDayPacingSettings(INITIAL_WELLNESS.dayPacing),
  );

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionState>(
      typeof Notification === "undefined"
        ? "unsupported"
        : Notification.permission,
    );
  const [notifyEnabled, setNotifyEnabled] = useState(
    INITIAL_WELLNESS.notifyEnabled,
  );

  const permissionRef = useRef(permissionStatus);
  const notifyEnabledRef = useRef(notifyEnabled);

  useLayoutEffect(() => {
    permissionRef.current = permissionStatus;
    notifyEnabledRef.current = notifyEnabled;
  }, [permissionStatus, notifyEnabled]);

  const getPermission = useCallback(() => permissionRef.current, []);
  const getNotifyEnabled = useCallback(() => notifyEnabledRef.current, []);

  const consumptionInit = alignConsumptionToDay(
    INITIAL_WELLNESS.water.consumedMl,
    INITIAL_WELLNESS.water.consumptionDay,
    localDateKey(new Date()),
  );
  const [consumedMl, setConsumedMl] = useState(consumptionInit.consumedMl);
  const [consumptionDay, setConsumptionDay] = useState(
    consumptionInit.consumptionDay,
  );
  const [dailyGoalMl, setDailyGoalMl] = useState(
    INITIAL_WELLNESS.water.dailyGoalMl,
  );

  const posture = usePostureReminderEngine({
    settings,
    initial: INITIAL_WELLNESS.posture,
    getPermission,
    getNotifyEnabled,
  });

  const water = useWaterReminderEngine({
    settings,
    initial: INITIAL_WELLNESS.water,
    getPermission,
    getNotifyEnabled,
  });

  function unlockAllAudio() {
    void posture.unlockAudioForUserGesture();
    void water.unlockAudioForUserGesture();
  }

  function handleNotificationHeroClick() {
    unlockAllAudio();

    if (typeof Notification === "undefined") {
      setPermissionStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setNotifyEnabled((prev) => !prev);
      return;
    }

    if (Notification.permission === "denied") {
      return;
    }

    void Notification.requestPermission().then((permission) => {
      setPermissionStatus(permission);
      if (permission === "granted") {
        setNotifyEnabled(true);
      }
    });
  }

  useEffect(() => {
    function syncPermission() {
      if (typeof Notification !== "undefined") {
        setPermissionStatus(Notification.permission);
      }
    }
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, []);

  const postureApiRef = useRef(posture);
  const waterApiRef = useRef(water);

  useLayoutEffect(() => {
    postureApiRef.current = posture;
    waterApiRef.current = water;
  }, [posture, water]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        postureApiRef.current.resumeAudioIfPossible();
        waterApiRef.current.resumeAudioIfPossible();
      }
    }
    function onPointerDown() {
      postureApiRef.current.resumeAudioIfPossible();
      waterApiRef.current.resumeAudioIfPossible();
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

  useEffect(() => {
    const id = window.setInterval(() => {
      const today = localDateKey(new Date());
      if (today !== consumptionDay) {
        startTransition(() => {
          setConsumedMl(0);
          setConsumptionDay(today);
        });
      }
    }, 60_000);
    return () => window.clearInterval(id);
  }, [consumptionDay]);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    const waterReminder = water.buildWaterReminderPersistSlice();

    writeWellnessPersist({
      v: 2,
      activeTrack,
      notifyEnabled,
      dayPacing: settings,
      posture: posture.buildPosturePersistSlice(),
      water: {
        ...waterReminder,
        consumedMl,
        dailyGoalMl,
        consumptionDay,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slice builders read refs; deps are the primitive fields that affect persisted queues
  }, [
    activeTrack,
    notifyEnabled,
    settings,
    consumedMl,
    dailyGoalMl,
    consumptionDay,
    posture.isRunning,
    posture.nextReminderAt,
    posture.currentVideoIndex,
    posture.lastReminderTime,
    posture.upcomingCount,
    water.isRunning,
    water.nextReminderAt,
    water.upcomingCount,
  ]);

  const intervalMinutesNum = Number(settings.intervalMinutes);
  const intervalSelectValue =
    Number.isFinite(intervalMinutesNum) &&
    (INTERVAL_OPTIONS as readonly number[]).includes(intervalMinutesNum)
      ? String(intervalMinutesNum)
      : "30";

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

  const windowMinutes = useMemo(
    () => activeWindowMinutes(settings.startTime, settings.endTime, new Date()),
    [settings.startTime, settings.endTime],
  );

  const intervalMinutesResolved = useMemo(() => {
    const n = Number(settings.intervalMinutes);
    return Math.max(1, Number.isFinite(n) ? n : 30);
  }, [settings.intervalMinutes]);

  const sipHintMl = useMemo(
    () =>
      suggestedSipMl(dailyGoalMl, windowMinutes, intervalMinutesResolved),
    [dailyGoalMl, windowMinutes, intervalMinutesResolved],
  );

  const hydrationPercent = useMemo(
    () => hydrationPercentDisplay(consumedMl, dailyGoalMl),
    [consumedMl, dailyGoalMl],
  );

  function addWaterMl(amountMl: number) {
    const n = Math.max(0, amountMl);
    if (n === 0) {
      return;
    }
    setConsumedMl((c) => c + n);
  }

  function reduceWaterMl(amountMl: number) {
    const n = Math.max(0, amountMl);
    if (n === 0) {
      return;
    }
    setConsumedMl((c) => Math.max(0, c - n));
  }

  function resetWaterConsumption() {
    setConsumedMl(0);
  }

  const postureStartWithAudio = () => {
    unlockAllAudio();
    posture.handleStart();
  };

  const waterStartWithAudio = () => {
    unlockAllAudio();
    water.handleStart();
  };

  return {
    activeTrack,
    setActiveTrack,
    settings,
    setSettings,
    permissionStatus,
    notifyEnabled,
    isRunning: posture.isRunning,
    upcomingCount: posture.upcomingCount,
    intervalSelectValue,
    activeVideo: posture.activeVideo,
    countdownLabel: posture.countdownLabel,
    ringDashOffset: posture.ringDashOffset,
    isAlertDialogOpen: posture.isAlertDialogOpen,
    activeReminderLabel: posture.activeReminderLabel,
    nextReminderAt: posture.nextReminderAt,
    acknowledgeReminder: posture.acknowledgeReminder,
    handleStart: postureStartWithAudio,
    stopReminders: posture.stopReminders,
    heroButtonDisabled,
    heroButtonLabel,
    heroButtonClass,
    handleNotificationHeroClick,
    waterCountdownLabel: water.countdownLabel,
    waterRingDashOffset: water.ringDashOffset,
    waterIsRunning: water.isRunning,
    waterUpcomingCount: water.upcomingCount,
    waterNextReminderAt: water.nextReminderAt,
    waterIsAlertOpen: water.isAlertDialogOpen,
    waterActiveReminderLabel: water.activeReminderLabel,
    acknowledgeWaterReminder: water.acknowledgeReminder,
    startWaterReminders: waterStartWithAudio,
    stopWaterReminders: water.stopReminders,
    consumedMl,
    dailyGoalMl,
    setDailyGoalMl,
    hydrationPercent,
    sipHintMl,
    intervalMinutesResolved,
    addWaterMl,
    reduceWaterMl,
    resetWaterConsumption,
  };
}
