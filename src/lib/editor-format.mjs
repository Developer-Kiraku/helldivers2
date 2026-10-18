export const editorTags = ['p','div','span','br','b','strong','i','em','u','s','ul','ol','li','blockquote','h2','h3','a','img','iframe','font'];
export const minFontSize = 12, maxFontSize = 72;
export function youtubeEmbedUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be' && parts.length === 1 ? parts[0] : host === 'youtube.com' && url.pathname === '/watch' ? url.searchParams.get('v') : ['youtube.com','youtube-nocookie.com'].includes(host) && ['embed','shorts','live'].includes(parts[0]) && parts.length === 2 ? parts[1] : null;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null;
    const result = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    const time = url.searchParams.get('start') || url.searchParams.get('t') || new URLSearchParams(url.hash.slice(1)).get('t') || '';
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
    const seconds = /^\d+$/.test(time) ? Number(time) : match ? Number(match[1] || 0)*3600+Number(match[2] || 0)*60+Number(match[3] || 0) : 0;
    if (Number.isInteger(seconds) && seconds > 0 && seconds <= 604800) result.searchParams.set('start', String(seconds));
    return result.href;
  } catch { return null; }
}
export function youtubeAttributes(src) {
  return { src, title: 'YouTube 동영상', loading: 'lazy', allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen', allowfullscreen: '', referrerpolicy: 'strict-origin-when-cross-origin', class: 'youtube-embed' };
}
