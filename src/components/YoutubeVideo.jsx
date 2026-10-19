import { youtubeEmbedUrl } from '@/lib/editor-format.mjs';
import './youtube-video.css';

export default function YoutubeVideo({url, title = 'YouTube 동영상'}) {
  const src = youtubeEmbedUrl(url);
  if (!src) return null;
  return <div className="youtube-video"><iframe src={src} title={`${title} · YouTube 동영상`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>;
}
