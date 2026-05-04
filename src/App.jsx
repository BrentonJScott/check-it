import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SETTINGS = {
  startTime: "08:00",
  endTime: "16:00",
  intervalMinutes: 30,
};

const POSTURE_VIDEO_CLIPS = [
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

function parseTimeForDate(timeString, baseDate) {
  const [hoursString, minutesString] = timeString.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function createUpcomingReminderSchedule(
  fromTime,
  startTime,
  endTime,
  intervalMinutes,
) {
  const intervalMs = Number(intervalMinutes) * 60 * 1000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return {
      error: "Interval must be a positive number of minutes.",
      reminders: [],
    };
  }

  // Scan forward for the first day window that can produce reminders.
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

    let baseTime = dayStart;

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

    const reminders = [];
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

function nextVideoIndex(previousIndex) {
  if (POSTURE_VIDEO_CLIPS.length <= 1) {
    return 0;
  }

  return (previousIndex + 1) % POSTURE_VIDEO_CLIPS.length;
}

function formatCountdown(milliseconds) {
  const safeValue = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Configure your day, then start reminders.",
  );
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [lastReminderTime, setLastReminderTime] = useState(null);
  const [nextReminderAt, setNextReminderAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [activeReminderLabel, setActiveReminderLabel] = useState("");

  const timerRef = useRef(null);
  const queueRef = useRef([]);
  const audioContextRef = useRef(null);
  const repeatingSoundIntervalRef = useRef(null);

  const activeVideo = useMemo(
    () => POSTURE_VIDEO_CLIPS[currentVideoIndex],
    [currentVideoIndex],
  );
  const countdownLabel = useMemo(() => {
    if (!isRunning || !nextReminderAt) {
      return "--:--";
    }

    return formatCountdown(nextReminderAt.getTime() - nowTick);
  }, [isRunning, nextReminderAt, nowTick]);

  function clearActiveTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopReminders(message) {
    clearActiveTimer();
    stopRepeatingAlertSound();
    queueRef.current = [];
    setUpcomingCount(0);
    setNextReminderAt(null);
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    setIsRunning(false);
    if (message) {
      setStatusMessage(message);
    }
  }

  function playAlertSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      context.resume();
    }

    const tones = [
      { frequency: 880, offset: 0 },
      { frequency: 660, offset: 0.2 },
    ];

    tones.forEach(({ frequency, offset }) => {
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
    });
  }

  function stopRepeatingAlertSound() {
    if (repeatingSoundIntervalRef.current) {
      clearInterval(repeatingSoundIntervalRef.current);
      repeatingSoundIntervalRef.current = null;
    }
  }

  function startRepeatingAlertSound() {
    stopRepeatingAlertSound();
    playAlertSound();
    repeatingSoundIntervalRef.current = setInterval(() => {
      playAlertSound();
    }, 1200);
  }

  function acknowledgeReminder() {
    stopRepeatingAlertSound();
    setIsAlertDialogOpen(false);
    setActiveReminderLabel("");
    scheduleNextReminder();
  }

  function refreshQueueForUpcomingWindow(referenceTime) {
    const { error, reminders, dayStart } = createUpcomingReminderSchedule(
      referenceTime,
      settings.startTime,
      settings.endTime,
      settings.intervalMinutes,
    );

    if (error) {
      stopReminders(error);
      return false;
    }

    if (reminders.length === 0) {
      stopReminders("No reminders could be scheduled.");
      return false;
    }

    queueRef.current = reminders;

    if (referenceTime < dayStart) {
      setStatusMessage(
        "Outside your daily window. Waiting for the next workday start.",
      );
    }

    return true;
  }

  function triggerReminder(triggerTime) {
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

    const timestamp = triggerTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setStatusMessage(`Posture check at ${timestamp}. Opened your next video.`);

    if (permissionStatus === "granted") {
      new Notification("Posture check", {
        body: "Time to reset your posture. Dismiss the reminder dialog to continue.",
      });
    }
  }

  function scheduleNextReminder() {
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
      stopReminders("Unable to schedule the next reminder.");
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

  function handleStart() {
    const queueWasRefreshed = refreshQueueForUpcomingWindow(new Date());
    if (!queueWasRefreshed) {
      return;
    }

    setLastReminderTime(null);
    setNowTick(Date.now());
    setIsRunning(true);
    setStatusMessage(
      "Reminders started. They run during your daily window and resume next day.",
    );
    scheduleNextReminder();
  }

  function requestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setPermissionStatus("unsupported");
      setStatusMessage("Notifications are not supported in this browser.");
      return;
    }

    Notification.requestPermission().then((permission) => {
      setPermissionStatus(permission);
      if (permission === "granted") {
        setStatusMessage("Notifications enabled. You will get browser alerts.");
      }
      if (permission === "denied") {
        setStatusMessage("Notifications denied. Enable them in browser settings.");
      }
    });
  }

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
        audioContextRef.current.close();
      }
      stopRepeatingAlertSound();
    };
  }, []);

  return (
    <main className="app-shell">
      {isAlertDialogOpen && (
        <div className="alert-overlay" role="alertdialog" aria-modal="true">
          <div className="alert-dialog">
            <h2>Posture check</h2>
            <p className="subtle">
              Your {activeReminderLabel} reminder is ready. Acknowledge this alert to
              stop the sound and continue the schedule.
            </p>
            <button onClick={acknowledgeReminder} type="button">
              I checked my posture
            </button>
          </div>
        </div>
      )}

      <section className="panel">
        <h1>Check-It Posture Reminders</h1>
        <p className="subtle">
          Build a simple schedule and get nudges throughout your workday.
        </p>

        <div className="field-grid">
          <label>
            Start time
            <input
              type="time"
              value={settings.startTime}
              onChange={(event) =>
                setSettings((previous) => ({
                  ...previous,
                  startTime: event.target.value,
                }))
              }
            />
          </label>

          <label>
            End time
            <input
              type="time"
              value={settings.endTime}
              onChange={(event) =>
                setSettings((previous) => ({
                  ...previous,
                  endTime: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Interval (minutes)
            <input
              type="number"
              min="1"
              value={settings.intervalMinutes}
              onChange={(event) =>
                setSettings((previous) => ({
                  ...previous,
                  intervalMinutes: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="button-row">
          <button onClick={requestNotificationPermission} type="button">
            Enable notifications
          </button>
          <button onClick={handleStart} type="button">
            Start reminders
          </button>
          <button onClick={() => stopReminders("Reminders stopped.")} type="button">
            Stop
          </button>
        </div>

        <p className="status">Status: {statusMessage}</p>
        <p className="meta">
          Notification permission: <strong>{permissionStatus}</strong> | Running:{" "}
          <strong>{isRunning ? "yes" : "no"}</strong> | Upcoming reminders:{" "}
          <strong>{upcomingCount}</strong>
        </p>
        <p className="meta">
          Next reminder:{" "}
          <strong>
            {nextReminderAt
              ? nextReminderAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "--"}
          </strong>{" "}
          | Countdown: <strong>{countdownLabel}</strong>
        </p>
      </section>

      <section className="panel">
        <h2>Current posture video</h2>
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
        <p className="meta">
          {lastReminderTime
            ? `Last reminder: ${lastReminderTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "No reminder has fired yet."}
        </p>
      </section>
    </main>
  );
}
