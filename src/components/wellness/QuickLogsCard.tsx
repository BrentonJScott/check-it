type QuickLogsCardProps = {
  onLog250: () => void;
  onLog500: () => void;
};

/** Two large buttons for the most common bottle sizes. */
export function QuickLogsCard({ onLog250, onLog500 }: QuickLogsCardProps) {
  return (
    <section className="quick-logs-card" aria-labelledby="quick-logs-title">
      <h2 id="quick-logs-title" className="quick-logs-card__title">
        Quick logs
      </h2>
      <div className="quick-logs-card__actions">
        <button type="button" className="quick-log-btn" onClick={onLog250}>
          <span className="quick-log-btn__icon" aria-hidden={true}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M8 3h8l1 4H7L8 3zm-1 6h10v12a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span>250ml glass</span>
        </button>
        <button type="button" className="quick-log-btn" onClick={onLog500}>
          <span className="quick-log-btn__icon" aria-hidden={true}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M9 2h6v3H9V2zm0 5h6v15a2 2 0 01-2 2h-2a2 2 0 01-2-2V7z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span>500ml bottle</span>
        </button>
      </div>
      <p className="quick-logs-card__quote">Water is the soul of the Earth.</p>
    </section>
  );
}
