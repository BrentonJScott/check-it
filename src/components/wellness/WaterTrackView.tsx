import type { Dispatch, SetStateAction } from "react";
import type {
  NotificationPermissionState,
  Settings,
} from "../../types/checkIt";
import { HydrationProgressCard } from "./HydrationProgressCard";
import { WaterHeroCard } from "./WaterHeroCard";
import { WaterIntentionRemindersSection } from "./WaterIntentionRemindersSection";

type WaterTrackViewProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  intervalSelectValue: string;
  countdownLabel: string;
  ringDashOffset: number;
  heroButtonClass: string;
  heroButtonDisabled: boolean;
  heroButtonLabel: string;
  onNotificationClick: () => void;
  consumedMl: number;
  dailyGoalMl: number;
  onGoalMlChange: (ml: number) => void;
  hydrationPercent: number;
  sipHintMl: number;
  intervalMinutes: number;
  onAddWater: (ml: number) => void;
  onReduceWater: (ml: number) => void;
  onResetWater: () => void;
  waterIsRunning: boolean;
  waterUpcomingCount: number;
  waterNextReminderAt: Date | null;
  permissionStatus: NotificationPermissionState;
  notifyEnabled: boolean;
  onStartWater: () => void;
  onStopWater: () => void;
};

/** Hydration layout: hero + tank, merged intention/reminders (like posture pacing). */
export function WaterTrackView({
  settings,
  setSettings,
  intervalSelectValue,
  countdownLabel,
  ringDashOffset,
  heroButtonClass,
  heroButtonDisabled,
  heroButtonLabel,
  onNotificationClick,
  consumedMl,
  dailyGoalMl,
  onGoalMlChange,
  hydrationPercent,
  sipHintMl,
  intervalMinutes,
  onAddWater,
  onReduceWater,
  onResetWater,
  waterIsRunning,
  waterUpcomingCount,
  waterNextReminderAt,
  permissionStatus,
  notifyEnabled,
  onStartWater,
  onStopWater,
}: WaterTrackViewProps) {
  return (
    <div className="track-layout track-layout--water">
      <div className="water-top-row">
        <WaterHeroCard
          countdownLabel={countdownLabel}
          ringDashOffset={ringDashOffset}
          heroButtonClass={heroButtonClass}
          heroButtonDisabled={heroButtonDisabled}
          heroButtonLabel={heroButtonLabel}
          onNotificationClick={onNotificationClick}
        />
        <HydrationProgressCard
          percent={hydrationPercent}
          consumedMl={consumedMl}
          goalMl={dailyGoalMl}
          addAmountMl={sipHintMl}
          onFabClick={() => onAddWater(sipHintMl)}
          onReduceWater={onReduceWater}
          onResetWater={onResetWater}
        />
      </div>

      <WaterIntentionRemindersSection
        settings={settings}
        setSettings={setSettings}
        intervalSelectValue={intervalSelectValue}
        dailyGoalMl={dailyGoalMl}
        onGoalMlChange={onGoalMlChange}
        sipHintMl={sipHintMl}
        intervalMinutes={intervalMinutes}
        waterIsRunning={waterIsRunning}
        waterUpcomingCount={waterUpcomingCount}
        waterNextReminderAt={waterNextReminderAt}
        permissionStatus={permissionStatus}
        notifyEnabled={notifyEnabled}
        onStartWater={onStartWater}
        onStopWater={onStopWater}
      />
    </div>
  );
}
