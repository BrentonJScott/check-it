import { POSTURE_VIDEO_CLIPS } from "../data/postureVideos";

type InfoGridProps = {
  isRunning: boolean;
  upcomingCount: number;
};

export function InfoGrid({ isRunning, upcomingCount }: InfoGridProps) {
  return (
    <div className="info-grid">
      <article className="info-card info-card--secondary">
        <h3 className="info-card__title">Daily consistency</h3>
        <p className="info-card__text">
          {isRunning
            ? `${upcomingCount} posture check${upcomingCount === 1 ? "" : "s"} queued in your current window.`
            : "Start reminders during your active hours to build a steady desk routine."}
        </p>
        <div className="info-card__icon" aria-hidden={true}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
      </article>
      <article className="info-card info-card--tertiary">
        <h3 className="info-card__title">Mindful moments</h3>
        <p className="info-card__text">
          {`${POSTURE_VIDEO_CLIPS.length}+ short videos (full clips, not trimmed), rotated each time you acknowledge a reminder.`}
        </p>
        <div className="info-card__icon" aria-hidden={true}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3c-1.2 4-4 5-7 5v11h14V8c-3 0-5.8-1-7-5z" />
            <path d="M8 21v-6M16 21v-6" />
          </svg>
        </div>
      </article>
    </div>
  );
}
