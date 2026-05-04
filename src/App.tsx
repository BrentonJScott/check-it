import { PostureReminderDialog } from "./components/PostureReminderDialog";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { PostureTrackView } from "./components/wellness/PostureTrackView";
import { WaterReminderDialog } from "./components/wellness/WaterReminderDialog";
import { WaterTrackView } from "./components/wellness/WaterTrackView";
import { WellnessTrackNav } from "./components/wellness/WellnessTrackNav";
import { useWellnessApp } from "./wellness/useWellnessApp";

export default function App() {
  const w = useWellnessApp();

  const pageClassName =
    w.activeTrack === "water" ? "page page--wide" : "page";

  return (
    <>
      <PostureReminderDialog
        open={w.isAlertDialogOpen}
        activeReminderLabel={w.activeReminderLabel}
        onAcknowledge={w.acknowledgeReminder}
      />
      <WaterReminderDialog
        open={w.waterIsAlertOpen}
        activeReminderLabel={w.waterActiveReminderLabel}
        onAcknowledge={w.acknowledgeWaterReminder}
      />

      <div className={pageClassName}>
        <SiteHeader />
        <div className="page__nav-wrap">
          <WellnessTrackNav active={w.activeTrack} onChange={w.setActiveTrack} />
        </div>

        <div className="page__inner">
          {w.activeTrack === "posture" ? (
            <PostureTrackView
              settings={w.settings}
              setSettings={w.setSettings}
              intervalSelectValue={w.intervalSelectValue}
              isRunning={w.isRunning}
              permissionStatus={w.permissionStatus}
              notifyEnabled={w.notifyEnabled}
              upcomingCount={w.upcomingCount}
              nextReminderAt={w.nextReminderAt}
              activeVideo={w.activeVideo}
              countdownLabel={w.countdownLabel}
              ringDashOffset={w.ringDashOffset}
              heroButtonClass={w.heroButtonClass}
              heroButtonDisabled={w.heroButtonDisabled}
              heroButtonLabel={w.heroButtonLabel}
              onNotificationClick={w.handleNotificationHeroClick}
              onStartPosture={w.handleStart}
              onStopPosture={w.stopReminders}
            />
          ) : (
            <WaterTrackView
              settings={w.settings}
              setSettings={w.setSettings}
              intervalSelectValue={w.intervalSelectValue}
              countdownLabel={w.waterCountdownLabel}
              ringDashOffset={w.waterRingDashOffset}
              heroButtonClass={w.heroButtonClass}
              heroButtonDisabled={w.heroButtonDisabled}
              heroButtonLabel={w.heroButtonLabel}
              onNotificationClick={w.handleNotificationHeroClick}
              consumedMl={w.consumedMl}
              dailyGoalMl={w.dailyGoalMl}
              onGoalMlChange={w.setDailyGoalMl}
              hydrationPercent={w.hydrationPercent}
              sipHintMl={w.sipHintMl}
              intervalMinutes={w.intervalMinutesResolved}
              onAddWater={w.addWaterMl}
              onReduceWater={w.reduceWaterMl}
              onResetWater={w.resetWaterConsumption}
              waterIsRunning={w.waterIsRunning}
              waterUpcomingCount={w.waterUpcomingCount}
              waterNextReminderAt={w.waterNextReminderAt}
              permissionStatus={w.permissionStatus}
              notifyEnabled={w.notifyEnabled}
              onStartWater={w.startWaterReminders}
              onStopWater={w.stopWaterReminders}
            />
          )}
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
