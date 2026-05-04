import type { WellnessTrack } from "../../wellness/wellnessTypes";

type WellnessTrackNavProps = {
  active: WellnessTrack;
  onChange: (track: WellnessTrack) => void;
};

/**
 * Switches between reminder experiences. Add a new button when you add a track.
 */
export function WellnessTrackNav({ active, onChange }: WellnessTrackNavProps) {
  return (
    <nav className="wellness-nav" aria-label="Wellness areas">
      <button
        type="button"
        className={
          active === "posture"
            ? "wellness-nav__btn wellness-nav__btn--active"
            : "wellness-nav__btn"
        }
        onClick={() => onChange("posture")}
        aria-current={active === "posture" ? "page" : undefined}
      >
        Posture
      </button>
      <button
        type="button"
        className={
          active === "water"
            ? "wellness-nav__btn wellness-nav__btn--active"
            : "wellness-nav__btn"
        }
        onClick={() => onChange("water")}
        aria-current={active === "water" ? "page" : undefined}
      >
        Hydration
      </button>
    </nav>
  );
}
