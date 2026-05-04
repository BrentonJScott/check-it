type WaterReminderDialogProps = {
  open: boolean;
  activeReminderLabel: string;
  onAcknowledge: () => void;
};

export function WaterReminderDialog({
  open,
  activeReminderLabel,
  onAcknowledge,
}: WaterReminderDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="alert-overlay" role="alertdialog" aria-modal="true">
      <div className="alert-dialog">
        <h2>Hydration check</h2>
        <p className="subtle">
          Your {activeReminderLabel} reminder is here. Log a drink if you can, then
          acknowledge to silence the alert and keep your schedule.
        </p>
        <button
          className="btn btn--primary btn--block"
          onClick={onAcknowledge}
          type="button"
        >
          I took a sip
        </button>
      </div>
    </div>
  );
}
