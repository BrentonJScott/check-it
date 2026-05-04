import type { Dispatch, SetStateAction } from "react";
import { GuidedStretchSection } from "../GuidedStretchSection";
import { HeroCard } from "../HeroCard";
import { InfoGrid } from "../InfoGrid";
import { PacingSection } from "../PacingSection";
import type {
  NotificationPermissionState,
  PostureVideoClip,
  Settings,
} from "../../types/checkIt";

type PostureTrackViewProps = {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  intervalSelectValue: string;
  isRunning: boolean;
  permissionStatus: NotificationPermissionState;
  notifyEnabled: boolean;
  upcomingCount: number;
  nextReminderAt: Date | null;
  activeVideo: PostureVideoClip;
  countdownLabel: string;
  ringDashOffset: number;
  heroButtonClass: string;
  heroButtonDisabled: boolean;
  heroButtonLabel: string;
  onNotificationClick: () => void;
  onStartPosture: () => void;
  onStopPosture: () => void;
};

/** Everything that belongs to the posture + stretch experience. */
export function PostureTrackView({
  settings,
  setSettings,
  intervalSelectValue,
  isRunning,
  permissionStatus,
  notifyEnabled,
  upcomingCount,
  nextReminderAt,
  activeVideo,
  countdownLabel,
  ringDashOffset,
  heroButtonClass,
  heroButtonDisabled,
  heroButtonLabel,
  onNotificationClick,
  onStartPosture,
  onStopPosture,
}: PostureTrackViewProps) {
  return (
    <div className="track-layout">
      <HeroCard
        countdownLabel={countdownLabel}
        ringDashOffset={ringDashOffset}
        heroButtonClass={heroButtonClass}
        heroButtonDisabled={heroButtonDisabled}
        heroButtonLabel={heroButtonLabel}
        onNotificationClick={onNotificationClick}
      />

      <PacingSection
        settings={settings}
        setSettings={setSettings}
        intervalSelectValue={intervalSelectValue}
        isRunning={isRunning}
        permissionStatus={permissionStatus}
        notifyEnabled={notifyEnabled}
        upcomingCount={upcomingCount}
        nextReminderAt={nextReminderAt}
        onStart={onStartPosture}
        onStop={onStopPosture}
        sharedScheduleHint="These times also control hydration reminders on the Hydration tab."
      />

      <GuidedStretchSection video={activeVideo} />

      <InfoGrid isRunning={isRunning} upcomingCount={upcomingCount} />
    </div>
  );
}
