/**
 * Builds the ordered list of future reminder instants to save in localStorage.
 * (Same rule for posture and water: current timer head + queued tail.)
 */
export function collectPendingReminderIso(
  nextReminderAt: Date | null,
  queueOldestFirst: Date[],
): string[] {
  const now = Date.now();
  const pending: Date[] = [];
  if (nextReminderAt && nextReminderAt.getTime() > now) {
    pending.push(nextReminderAt);
  }
  for (const d of queueOldestFirst) {
    if (d.getTime() > now) {
      pending.push(d);
    }
  }
  pending.sort((a, b) => a.getTime() - b.getTime());
  return pending.map((d) => d.toISOString());
}
