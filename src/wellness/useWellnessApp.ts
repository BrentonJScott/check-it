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
 * Top-level wellness state: which track you are viewing, day pacing per track,
 * browser notifications, posture reminders, water intake, and water reminders.
 *
 * Persistence is written in one place so juniors can follow a single save path.
 */
function intervalSelectValueFor(pacing: Settings): string {
  const intervalMinutesNum = Number(pacing.intervalMinutes);
  return Number.isFinite(intervalMinutesNum) &&
    (INTERVAL_OPTIONS as readonly number[]).includes(intervalMinutesNum)
    ? String(intervalMinutesNum)
    : "30";
}

export function useWellnessApp() {
  const skipNextPersistRef = useRef(true);

  const [activeTrack, setActiveTrack] = useState<WellnessTrack>(
    INITIAL_WELLNESS.activeTrack,
  );
  const [posturePacing, setPosturePacing] = useState<Settings>(() =>
    mergeDayPacingSettings(INITIAL_WELLNESS.posturePacing),
  );
  const [waterPacing, setWaterPacing] = useState<Settings>(() =>
    mergeDayPacingSettings(INITIAL_WELLNESS.waterPacing),
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
    settings: posturePacing,
    initial: INITIAL_WELLNESS.posture,
    getPermission,
    getNotifyEnabled,
  });

  const water = useWaterReminderEngine({
    settings: waterPacing,
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
      v: 3,
      activeTrack,
      notifyEnabled,
      posturePacing,
      waterPacing,
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
    posturePacing,
    waterPacing,
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

  const postureIntervalSelectValue = intervalSelectValueFor(posturePacing);
  const waterIntervalSelectValue = intervalSelectValueFor(waterPacing);

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
    () =>
      activeWindowMinutes(
        waterPacing.startTime,
        waterPacing.endTime,
        new Date(),
      ),
    [waterPacing.startTime, waterPacing.endTime],
  );

  const intervalMinutesResolved = useMemo(() => {
    const n = Number(waterPacing.intervalMinutes);
    return Math.max(1, Number.isFinite(n) ? n : 30);
  }, [waterPacing.intervalMinutes]);

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

  function acknowledgeWaterReminder() {
    addWaterMl(sipHintMl);
    water.acknowledgeReminder();
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
    posturePacing,
    setPosturePacing,
    waterPacing,
    setWaterPacing,
    permissionStatus,
    notifyEnabled,
    isRunning: posture.isRunning,
    upcomingCount: posture.upcomingCount,
    postureIntervalSelectValue,
    waterIntervalSelectValue,
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
    acknowledgeWaterReminder,
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
