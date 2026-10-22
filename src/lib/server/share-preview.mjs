import { postSummary } from '../post-summary.mjs';
import { site } from '../site.mjs';

export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

// Only the title and a short excerpt are public. The full article remains behind login.
export function sharePreview(post, shareUrl) {
  const title = escapeHtml(post.title);
  const description = escapeHtml(postSummary(post));
  const image = escapeHtml(new URL('/' + site.image, shareUrl).href);
  const url = escapeHtml(shareUrl);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | ${escapeHtml(site.title)}</title>
<meta name="description" content="${description}">
<meta name="robots" content="noindex,nofollow">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${escapeHtml(site.title)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${url}"></head>
<body><h1>${title}</h1><p>${description}</p><p>로그인 후 게시글 전체를 확인할 수 있습니다.</p>
<a href="/login">로그인하고 게시글 보기</a>
<script>location.replace('/login');</script></body></html>`;
}
