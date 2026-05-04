import type { Dispatch, SetStateAction } from "react";
import { INTERVAL_OPTIONS } from "../constants";
import type { NotificationPermissionState, Settings } from "../types/checkIt";

type PacingSectionProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  intervalSelectValue: string;
  isRunning: boolean;
  permissionStatus: NotificationPermissionState;
  notifyEnabled: boolean;
  upcomingCount: number;
  nextReminderAt: Date | null;
  onStart: () => void;
  onStop: () => void;
};

export function PacingSection({
  settings,
  setSettings,
  intervalSelectValue,
  isRunning,
  permissionStatus,
  notifyEnabled,
  upcomingCount,
  nextReminderAt,
  onStart,
  onStop,
}: PacingSectionProps) {
  return (
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
          onClick={onStart}
          disabled={isRunning}
        >
          {isRunning ? "Reminders on" : "Start reminders"}
        </button>
        <button
          type="button"
          className="btn btn--tertiary"
          onClick={onStop}
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
  );
}
