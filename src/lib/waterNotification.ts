import { WATER_NOTIFICATION_TAG } from "../constants";
import type { NotificationPermissionState } from "../types/checkIt";

export function tryShowWaterReminderNotification(
  permission: NotificationPermissionState,
  notifyEnabled: boolean,
): void {
  if (permission !== "granted" || !notifyEnabled) {
    return;
  }
  new Notification("Hydration check", {
    body: "Time for a sip of water. Dismiss the reminder when you are ready.",
    silent: false,
    tag: WATER_NOTIFICATION_TAG,
  });
}
