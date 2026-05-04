import { POSTURE_NOTIFICATION_TAG } from "../constants";
import type { NotificationPermissionState } from "../types/checkIt";

export function tryShowPostureCheckNotification(
  permission: NotificationPermissionState,
  notifyEnabled: boolean,
): void {
  if (permission !== "granted" || !notifyEnabled) {
    return;
  }
  new Notification("Posture check", {
    body: "Time to reset your posture. Dismiss the reminder dialog to continue.",
    silent: false,
    tag: POSTURE_NOTIFICATION_TAG,
  });
}
