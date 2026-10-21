import sanitizeHtml from 'sanitize-html';
import { editorTags, youtubeEmbedUrl, youtubeAttributes } from '../editor-format.mjs';

export function sanitizePostHtml(raw, images = []) {
  return sanitizeHtml(raw, {
    allowedTags: editorTags.filter((tag) => tag !== 'font'),
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      iframe: ['src', 'title', 'loading', 'allow', 'allowfullscreen', 'referrerpolicy', 'class'],
    },
    allowedStyles: {
      '*': {
        'font-size': [/^(?:1[2-9]|[2-6]\d|7[0-2])px$/],
        'text-align': [/^(?:left|center|right|justify)$/],
        'font-weight': [/^(?:bold|normal|[1-9]00)$/],
        'font-style': [/^(?:italic|normal)$/],
        'text-decoration': [/^(?:underline|line-through|none)$/],
      },
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: { img: ['data', 'https'], iframe: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attrs) => ({
        tagName: 'a',
        attribs: { href: attrs.href || '', target: '_blank', rel: 'noopener noreferrer' },
      }),
      font: (tag, attrs) => ({ tagName: 'span', attribs: { style: attrs.style || '' } }),
      iframe: (tag, attrs) => ({
        tagName: 'iframe',
        attribs: youtubeAttributes(youtubeEmbedUrl(attrs.src) || ''),
      }),
    },
    exclusiveFilter: (frame) =>
      (frame.tag === 'img' && !images.includes(frame.attribs.src)) ||
      (frame.tag === 'iframe' && !frame.attribs.src),
  });
}
