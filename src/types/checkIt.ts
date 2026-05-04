export type Settings = {
  startTime: string;
  endTime: string;
  intervalMinutes: number | string;
};

export type PostureVideoClip = {
  id: string;
  title: string;
  embedUrl: string;
};

export type ScheduleSuccess = {
  error: null;
  reminders: Date[];
  dayStart: Date;
  dayEnd: Date;
};

export type ScheduleFailure = {
  error: string;
  reminders: Date[];
};

export type ScheduleResult = ScheduleSuccess | ScheduleFailure;

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";
