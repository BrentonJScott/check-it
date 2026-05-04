import type { PostureVideoClip } from "../types/checkIt";

type GuidedStretchSectionProps = {
  video: PostureVideoClip;
};

export function GuidedStretchSection({ video }: GuidedStretchSectionProps) {
  return (
    <section className="video-card" aria-labelledby="video-heading">
      <h2 id="video-heading">Guided stretch</h2>
      <p className="subtle">{video.title}</p>
      <div className="video-wrap">
        <iframe
          key={video.id}
          title={video.title}
          src={video.embedUrl}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}
