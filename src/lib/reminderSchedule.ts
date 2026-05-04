import type { ScheduleResult } from "../types/checkIt";

function parseTimeForDate(timeString: string, baseDate: Date): Date {
  const [hoursString, minutesString] = timeString.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function createUpcomingReminderSchedule(
  fromTime: Date,
  startTime: string,
  endTime: string,
  intervalMinutes: number | string,
): ScheduleResult {
  const intervalMs = Number(intervalMinutes) * 60 * 1000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return {
      error: "Interval must be a positive number of minutes.",
      reminders: [],
    };
  }

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = new Date(fromTime);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);

    const dayStart = parseTimeForDate(startTime, day);
    const dayEnd = parseTimeForDate(endTime, day);

    if (dayEnd <= dayStart) {
      return {
        error: "End time must be after start time.",
        reminders: [],
      };
    }

    let baseTime: Date = dayStart;

    if (dayOffset === 0) {
      if (fromTime >= dayEnd) {
        continue;
      }

      baseTime = fromTime < dayStart ? dayStart : fromTime;
    }

    const firstReminder = new Date(baseTime.getTime() + intervalMs);
    if (firstReminder > dayEnd) {
      continue;
    }

    const reminders: Date[] = [];
    const cursor = new Date(firstReminder);

    while (cursor <= dayEnd) {
      reminders.push(new Date(cursor));
      cursor.setTime(cursor.getTime() + intervalMs);
    }

    return { error: null, reminders, dayStart, dayEnd };
  }

  return {
    error: "Unable to create upcoming reminders from these settings.",
    reminders: [],
  };
}
