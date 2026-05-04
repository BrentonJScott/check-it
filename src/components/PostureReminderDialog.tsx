type PostureReminderDialogProps = {
  open: boolean;
  activeReminderLabel: string;
  onAcknowledge: () => void;
};

export function PostureReminderDialog({
  open,
  activeReminderLabel,
  onAcknowledge,
}: PostureReminderDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="alert-overlay" role="alertdialog" aria-modal="true">
      <div className="alert-dialog">
        <h2>Posture check</h2>
        <p className="subtle">
          Your {activeReminderLabel} reminder is ready. Acknowledge this alert to
          stop the sound and continue the schedule.
        </p>
        <button
          className="btn btn--primary btn--block"
          onClick={onAcknowledge}
          type="button"
        >
          I checked my posture
        </button>
      </div>
    </div>
  );
}
