import { RING_CIRCUMFERENCE, RING_RADIUS } from "../../constants";

type WaterHeroCardProps = {
  countdownLabel: string;
  ringDashOffset: number;
  heroButtonClass: string;
  heroButtonDisabled: boolean;
  heroButtonLabel: string;
  onNotificationClick: () => void;
};

/** Left column on the hydration screen: next-drink ring + quote + notification button. */
export function WaterHeroCard({
  countdownLabel,
  ringDashOffset,
  heroButtonClass,
  heroButtonDisabled,
  heroButtonLabel,
  onNotificationClick,
}: WaterHeroCardProps) {
  return (
    <section
      className="water-hero-card"
      aria-labelledby="water-hero-heading">
      <div className="timer-ring-wrap water-hero-card__ring">
        <svg
          viewBox="0 0 120 120"
          aria-hidden={true}>
          <circle
            className="timer-ring__track"
            cx="60"
            cy="60"
            r={RING_RADIUS}
          />
          <circle
            className="timer-ring__progress"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringDashOffset}
          />
        </svg>
        <div className="timer-ring__center">
          <span className="timer-ring__value">{countdownLabel}</span>
          <span className="timer-ring__kicker">Next drink</span>
        </div>
      </div>

      <h2
        id="hero-heading"
        className="hero-title">
        Stay hydrated.
      </h2>
      <p className="hero-sub">
        Your next drink is just around the corner.
      </p>

      <button
        type="button"
        className={heroButtonClass}
        onClick={onNotificationClick}
        disabled={heroButtonDisabled}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden={true}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {heroButtonLabel}
      </button>
    </section>
  );
}
