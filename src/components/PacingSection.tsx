import type { Dispatch, SetStateAction } from "react";
import type { NotificationPermissionState, Settings } from "../types/checkIt";
import { PacingScheduleFields } from "./PacingScheduleFields";

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
  /** Extra sentence for multi-track apps (e.g. that water uses the same window). */
  sharedScheduleHint?: string;
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
  sharedScheduleHint,
}: PacingSectionProps) {
  return (
    <section className="pacing-section" aria-labelledby="pacing-title">
      <h2 id="pacing-title" className="pacing-section__title">
        How should we pace your day?
      </h2>
      <p className="pacing-section__sub">
        Set your active hours and the rhythm of your reminders.
      </p>
      {sharedScheduleHint ? (
        <p className="pacing-section__hint">{sharedScheduleHint}</p>
      ) : null}

      <PacingScheduleFields
        settings={settings}
        setSettings={setSettings}
        intervalSelectValue={intervalSelectValue}
      />

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
