import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { PacingScheduleFields } from "../PacingScheduleFields";
import type {
  NotificationPermissionState,
  Settings,
} from "../../types/checkIt";

type WaterIntentionRemindersSectionProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  intervalSelectValue: string;
  dailyGoalMl: number;
  onGoalMlChange: (nextMl: number) => void;
  sipHintMl: number;
  intervalMinutes: number;
  waterIsRunning: boolean;
  waterUpcomingCount: number;
  waterNextReminderAt: Date | null;
  permissionStatus: NotificationPermissionState;
  notifyEnabled: boolean;
  onStartWater: () => void;
  onStopWater: () => void;
};

/**
 * Hydration goal + sip guidance + drink reminder Start/Stop, in the same layout
 * pattern as the Posture “How should we pace your day?” section.
 */
export function WaterIntentionRemindersSection({
  settings,
  setSettings,
  intervalSelectValue,
  dailyGoalMl,
  onGoalMlChange,
  sipHintMl,
  intervalMinutes,
  waterIsRunning,
  waterUpcomingCount,
  waterNextReminderAt,
  permissionStatus,
  notifyEnabled,
  onStartWater,
  onStopWater,
}: WaterIntentionRemindersSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draftMl, setDraftMl] = useState(String(dailyGoalMl));

  function commitGoal() {
    const parsed = Number(draftMl);
    if (Number.isFinite(parsed) && parsed >= 500 && parsed <= 8000) {
      onGoalMlChange(Math.round(parsed));
    } else {
      setDraftMl(String(dailyGoalMl));
    }
    setEditing(false);
  }

  return (
    <section className="pacing-section" aria-labelledby="water-intention-title">
      <h2 id="water-intention-title" className="pacing-section__title">
        Daily intention
      </h2>
      <p className="pacing-section__sub">
        Set your active hours, reminder rhythm, and daily hydration target. Drink
        reminders use the same schedule as posture reminders.
      </p>
      <p className="pacing-section__hint">
        Editing start, end, or interval here also updates the Posture tab.
      </p>

      <PacingScheduleFields
        settings={settings}
        setSettings={setSettings}
        intervalSelectValue={intervalSelectValue}
      />

      <div className="water-intention-card-body">
        <div className="intention-card__head">
          <span className="intention-card__title">Daily target</span>
          <button
            type="button"
            className="intention-card__edit"
            onClick={() => {
              if (editing) {
                commitGoal();
              } else {
                setDraftMl(String(dailyGoalMl));
                setEditing(true);
              }
            }}
            aria-label={editing ? "Save goal" : "Edit goal"}
          >
            {editing ? (
              "Save"
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                aria-hidden={true}
              >
                <path
                  d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="intention-card__goal-box">
          <span
            className="material-symbols-outlined intention-card__goal-icon"
            aria-hidden={true}>
            water_drop
          </span>
          <div>
            {editing ? (
              <label className="intention-card__goal-edit">
                <span className="visually-hidden">Daily goal in millilitres</span>
                <input
                  type="number"
                  min={500}
                  max={8000}
                  step={100}
                  value={draftMl}
                  onChange={(e) => setDraftMl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitGoal();
                    }
                  }}
                />
                <span className="intention-card__goal-unit">ml</span>
              </label>
            ) : (
              <div className="intention-card__goal-value">
                {(dailyGoalMl / 1000).toFixed(1)} Litres
              </div>
            )}
          </div>
        </div>

        <p className="intention-card__hint">
          Drink <strong>{sipHintMl}ml</strong> every{" "}
          <strong>{intervalMinutes} minutes</strong> to stay hydrated throughout your
          active hours.
        </p>
      </div>

      <div className="pacing-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onStartWater}
          disabled={waterIsRunning}
        >
          {waterIsRunning ? "Reminders on" : "Start drink reminders"}
        </button>
        <button
          type="button"
          className="btn btn--tertiary"
          onClick={onStopWater}
          disabled={!waterIsRunning}
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
        {waterIsRunning ? (
          <>
            {" "}
            · Upcoming: <strong>{waterUpcomingCount}</strong>
            {waterNextReminderAt ? (
              <>
                {" "}
                · Next at{" "}
                <strong>
                  {waterNextReminderAt.toLocaleTimeString([], {
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
