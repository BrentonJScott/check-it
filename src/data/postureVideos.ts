import type { PostureVideoClip } from "../types/checkIt";

export const POSTURE_VIDEO_CLIPS: readonly PostureVideoClip[] = [
  {
    id: "neck-reset",
    title: "Neck reset and shoulder release",
    embedUrl:
      "https://www.youtube.com/embed/Ef6LwAaB3_E?start=5&end=25&rel=0",
  },
  {
    id: "seated-t-spine",
    title: "Seated thoracic spine opener",
    embedUrl:
      "https://www.youtube.com/embed/2L2lnxIcNmo?start=0&end=20&rel=0",
  },
  {
    id: "desk-posture-reset",
    title: "Desk posture reset routine",
    embedUrl:
      "https://www.youtube.com/embed/c8SN8v9-SGk?start=8&end=30&rel=0",
  },
  {
    id: "scapular-activation",
    title: "Scapular activation quick drill",
    embedUrl:
      "https://www.youtube.com/embed/u0upTVw2bgU?start=6&end=22&rel=0",
  },
  {
    id: "core-bracing",
    title: "Core bracing posture drill",
    embedUrl:
      "https://www.youtube.com/embed/AnYl6Nk9GOA?start=3&end=18&rel=0",
  },
];

export function nextVideoIndex(previousIndex: number): number {
  if (POSTURE_VIDEO_CLIPS.length <= 1) {
    return 0;
  }
  return (previousIndex + 1) % POSTURE_VIDEO_CLIPS.length;
}
