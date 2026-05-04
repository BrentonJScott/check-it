import { GuidedStretchSection } from "./components/GuidedStretchSection";
import { HeroCard } from "./components/HeroCard";
import { InfoGrid } from "./components/InfoGrid";
import { PacingSection } from "./components/PacingSection";
import { PostureReminderDialog } from "./components/PostureReminderDialog";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useCheckItState } from "./hooks/useCheckItState";

export default function App() {
  const {
    settings,
    setSettings,
    permissionStatus,
    notifyEnabled,
    isRunning,
    upcomingCount,
    intervalSelectValue,
    activeVideo,
    countdownLabel,
    ringDashOffset,
    isAlertDialogOpen,
    activeReminderLabel,
    nextReminderAt,
    heroButtonDisabled,
    heroButtonLabel,
    heroButtonClass,
    acknowledgeReminder,
    handleStart,
    handleNotificationHeroClick,
    stopReminders,
  } = useCheckItState();

  return (
    <>
      <PostureReminderDialog
        open={isAlertDialogOpen}
        activeReminderLabel={activeReminderLabel}
        onAcknowledge={acknowledgeReminder}
      />

      <div className="page">
        <SiteHeader />

        <div className="page__inner">
          <HeroCard
            countdownLabel={countdownLabel}
            ringDashOffset={ringDashOffset}
            heroButtonClass={heroButtonClass}
            heroButtonDisabled={heroButtonDisabled}
            heroButtonLabel={heroButtonLabel}
            onNotificationClick={handleNotificationHeroClick}
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
            onStart={handleStart}
            onStop={stopReminders}
          />

          <GuidedStretchSection video={activeVideo} />

          <InfoGrid isRunning={isRunning} upcomingCount={upcomingCount} />
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
