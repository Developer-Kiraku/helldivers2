import DOMPurify from 'dompurify';
import { emoticonForSrc } from './emoticons.mjs';
import {
  editorTags,
  youtubeEmbedUrl,
  youtubeAttributes,
  minFontSize,
  maxFontSize,
  normalizeTextColor,
} from './editor-format.mjs';

export function cleanEditorHtml(raw) {
  const fragment = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: editorTags,
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'style',
      'target',
      'rel',
      'title',
      'class',
      'data-emoticon',
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  for (const image of fragment.querySelectorAll('img')) {
    const item = emoticonForSrc(image.getAttribute('src'));
    image.removeAttribute('class');
    image.removeAttribute('data-emoticon');
    if (item) {
      for (const attr of [...image.attributes]) image.removeAttribute(attr.name);
      image.setAttribute('src', item.src);
      image.setAttribute('alt', item.label);
      image.setAttribute('class', 'post-emoticon');
      image.setAttribute('data-emoticon', item.id);
    }
  }
  for (const node of fragment.querySelectorAll('[class],[data-emoticon]')) {
    if (node.tagName !== 'IMG' || !emoticonForSrc(node.getAttribute('src'))) {
      node.removeAttribute('class');
      node.removeAttribute('data-emoticon');
    }
  }
  for (const node of fragment.querySelectorAll('[style]')) {
    const size = node.style.fontSize,
      align = node.style.textAlign,
      weight = node.style.fontWeight,
      italic = node.style.fontStyle,
      decoration = node.style.textDecoration,
      color = normalizeTextColor(node.style.color);
    node.removeAttribute('style');
    if (/^\d+px$/.test(size) && parseInt(size) >= minFontSize && parseInt(size) <= maxFontSize)
      node.style.fontSize = size;
    if (/^(left|center|right|justify)$/.test(align)) node.style.textAlign = align;
    if (/^(bold|normal|[1-9]00)$/.test(weight)) node.style.fontWeight = weight;
    if (/^(italic|normal)$/.test(italic)) node.style.fontStyle = italic;
    if (/^(underline|line-through|none)$/.test(decoration)) node.style.textDecoration = decoration;
    if (color) node.style.color = color;
  }
  for (const frame of fragment.querySelectorAll('iframe')) {
    const src = youtubeEmbedUrl(frame.getAttribute('src'));
    if (!src) {
      frame.remove();
      continue;
    }
    for (const attr of [...frame.attributes]) frame.removeAttribute(attr.name);
    for (const [key, value] of Object.entries(youtubeAttributes(src)))
      frame.setAttribute(key, value);
  }
  for (const anchor of fragment.querySelectorAll('a')) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  for (const font of fragment.querySelectorAll('font')) {
    const span = document.createElement('span');
    span.style.cssText = font.style.cssText;
    span.append(...font.childNodes);
    font.replaceWith(span);
  }
  const root = document.createElement('div');
  root.append(fragment);
  return root.innerHTML;
}
