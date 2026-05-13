import type { PostureVideoClip } from "../types/checkIt";

/**
 * Full short videos only — embed URLs do not use `start`/`end` to trim longer uploads.
 * Prefer Shorts or other uploads where the whole video is a quick desk-friendly moment.
 */
function youtubeEmbed(youtubeId: string): string {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0`;
}

export const POSTURE_VIDEO_CLIPS: readonly PostureVideoClip[] = [
  {
    id: "countertop-shoulder-stretch",
    title: "Countertop shoulder stretch",
    embedUrl: youtubeEmbed("hoq7WTiSjl0"),
  },
  {
    id: "sitting-posture-work",
    title: "Sitting posture at your desk",
    embedUrl: youtubeEmbed("gFfN23elPTk"),
  },
  {
    id: "wrist-typing-relief",
    title: "Wrist relief for typing",
    embedUrl: youtubeEmbed("RXonMMRLU80"),
  },
  {
    id: "shoulders-tight-desk",
    title: "When your shoulders feel locked at your desk",
    embedUrl: youtubeEmbed("CjgEWaxBr98"),
  },
  {
    id: "neck-upper-back-reset",
    title: "Neck and upper-back reset",
    embedUrl: youtubeEmbed("gV2fy0VzhUQ"),
  },
];

export function nextVideoIndex(previousIndex: number): number {
  if (POSTURE_VIDEO_CLIPS.length <= 1) {
    return 0;
  }
  return (previousIndex + 1) % POSTURE_VIDEO_CLIPS.length;
}
