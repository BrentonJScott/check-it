/**
 * `YYYY-MM-DD` in the user’s local timezone. Used to reset “today’s” water total.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeOnDay(timeString: string, day: Date): Date {
  const [h, m] = timeString.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  const out = new Date(day);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

/**
 * Length of the configured active window today, in minutes (at least 1).
 */
export function activeWindowMinutes(
  startTime: string,
  endTime: string,
  referenceDay: Date,
): number {
  const start = parseTimeOnDay(startTime, referenceDay);
  const end = parseTimeOnDay(endTime, referenceDay);
  const diff = (end.getTime() - start.getTime()) / 60_000;
  return Math.max(1, diff);
}

/**
 * Rough sip size (ml) if the user spreads the goal evenly across reminder slots.
 * Shown as guidance only — not enforced when logging drinks.
 */
export function suggestedSipMl(
  goalMl: number,
  windowMinutes: number,
  intervalMinutes: number,
): number {
  const interval = Math.max(1, intervalMinutes);
  const slots = Math.max(1, Math.floor(windowMinutes / interval));
  return Math.round(goalMl / slots);
}

export function hydrationProgressRatio(consumedMl: number, goalMl: number): number {
  if (goalMl <= 0) {
    return 0;
  }
  return Math.min(1, consumedMl / goalMl);
}

export function hydrationPercentDisplay(
  consumedMl: number,
  goalMl: number,
): number {
  return Math.round(hydrationProgressRatio(consumedMl, goalMl) * 100);
}

/**
 * If the calendar day changed since we last saved, today’s consumption resets.
 */
export function alignConsumptionToDay(
  consumedMl: number,
  storedDay: string,
  todayKey: string,
): { consumedMl: number; consumptionDay: string } {
  if (storedDay === todayKey) {
    return { consumedMl, consumptionDay: storedDay };
  }
  return { consumedMl: 0, consumptionDay: todayKey };
}
