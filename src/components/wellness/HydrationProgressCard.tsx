type HydrationProgressCardProps = {
  percent: number;
  consumedMl: number;
  goalMl: number;
  onFabClick: () => void;
  onReduceWater: (ml: number) => void;
  onResetWater: () => void;
};

function formatLitres(ml: number): string {
  return `${(ml / 1000).toFixed(1)}L`;
}

function HydrationGlassIcon() {
  return (
    <span
      className="material-symbols-outlined hydration-glass-icon"
      aria-hidden={true}>
      water_drop
    </span>
  );
}

/** Tall card with “fill level”, quick-add control, and corrections (reduce / reset). */
export function HydrationProgressCard({
  percent,
  consumedMl,
  goalMl,
  onFabClick,
  onReduceWater,
  onResetWater,
}: HydrationProgressCardProps) {
  const fillPercent = Math.min(100, Math.max(0, percent));
  const hasLogged = consumedMl > 0;

  return (
    <section
      className="hydration-card"
      aria-labelledby="hydration-heading">
      <div className="hydration-card__header">
        <h2
          id="hydration-heading"
          className="visually-hidden">
          Hydration progress
        </h2>
        <div className="hydration-card__stats">
          <span className="hydration-card__percent">{percent}%</span>
          <span className="hydration-card__sub">
            {Math.round(consumedMl)}ml / {formatLitres(goalMl)}
          </span>
        </div>
      </div>

      <div className="hydration-card__tank">
        <div
          className="hydration-card__fill"
          style={{ height: `${fillPercent}%` }}
          aria-hidden={true}
        />
        <button
          type="button"
          className="hydration-card__quick-add"
          onClick={onFabClick}
          aria-label="Add 250 millilitres">
          <HydrationGlassIcon />
          <span className="hydration-card__quick-add-label">+250ml</span>
        </button>
      </div>

      <div
        className="hydration-card__adjust"
        role="group"
        aria-label="Adjust today’s intake">
        <button
          type="button"
          className="hydration-card__adjust-btn hydration-card__adjust-btn--reduce"
          onClick={() => onReduceWater(125)}
          disabled={!hasLogged}
          title={!hasLogged ? "Nothing to reduce yet" : undefined}
          aria-label="Remove 125 millilitres">
          <HydrationGlassIcon />
          <span>-125ml</span>
        </button>
        <button
          type="button"
          className="hydration-card__adjust-btn hydration-card__adjust-btn--reduce"
          onClick={() => onReduceWater(250)}
          disabled={!hasLogged}
          aria-label="Remove 250 millilitres">
          <HydrationGlassIcon />
          <HydrationGlassIcon />
          <span>-250ml</span>
        </button>
        <button
          type="button"
          className="hydration-card__adjust-btn hydration-card__adjust-btn--reduce"
          onClick={() => onReduceWater(500)}
          disabled={!hasLogged}
          aria-label="Remove 500 millilitres">
          <span className="hydration-glass-icons">
            <HydrationGlassIcon />
            <HydrationGlassIcon />
            <HydrationGlassIcon />
          </span>
          <span>-500ml</span>
        </button>
        <button
          type="button"
          className="hydration-card__adjust-btn hydration-card__adjust-btn--reset"
          onClick={onResetWater}
          disabled={!hasLogged}>
          Reset today
        </button>
      </div>
    </section>
  );
}
