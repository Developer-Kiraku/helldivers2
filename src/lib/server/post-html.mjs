import sanitizeHtml from 'sanitize-html';
import { parseDocument } from 'htmlparser2';
import { findAll, replaceElement, getOuterHTML } from 'domutils';
import { equipmentForId, equipmentForSrc, equipmentHtml } from '../equipment.mjs';
import { emoticonForSrc } from '../emoticons.mjs';
import { editorTags, youtubeEmbedUrl, youtubeAttributes } from '../editor-format.mjs';

export function sanitizePostHtml(raw, images = []) {
  const clean = sanitizeHtml(raw, {
    allowedTags: editorTags.filter((tag) => tag !== 'font'),
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'target', 'rel'],
      span: ['data-equipment'],
      img: ['src', 'alt', 'class', 'data-emoticon'],
      iframe: ['src', 'title', 'loading', 'allow', 'allowfullscreen', 'referrerpolicy', 'class'],
    },
    allowedStyles: {
      '*': {
        'font-size': [/^(?:1[2-9]|[2-6]\d|7[0-2])px$/],
        color: [
          /^#[a-f0-9]{3}(?:[a-f0-9]{3})?$/i,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
        ],
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
      img: (tag, attrs) => {
        const item = emoticonForSrc(attrs.src);
        return {
          tagName: 'img',
          attribs: item
            ? { src: item.src, alt: item.label, class: 'post-emoticon', 'data-emoticon': item.id }
            : { src: attrs.src || '', alt: attrs.alt || '' },
        };
      },
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
      (frame.tag === 'img' &&
        !images.includes(frame.attribs.src) &&
        !equipmentForSrc(frame.attribs.src) &&
        !emoticonForSrc(frame.attribs.src)) ||
      (frame.tag === 'iframe' && !frame.attribs.src),
  });
  if (!clean.includes('data-equipment=')) return clean;
  // Only catalog IDs can produce badges. Rebuild every child and label after sanitizing.
  const document = parseDocument(clean);
  for (const node of findAll(
    (node) => node.name === 'span' && node.attribs?.['data-equipment'],
    document.children,
  )) {
    const item = equipmentForId(node.attribs['data-equipment']);
    if (item) replaceElement(node, parseDocument(equipmentHtml(item)).children[0]);
    else delete node.attribs['data-equipment'];
  }
  return getOuterHTML(document, { encodeEntities: 'utf8', emptyAttrs: true });
}
