import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';
import { emoticonForId, emoticonForSrc } from './emoticons.mjs';
import { TextStyle, FontSize, Color } from '@tiptap/extension-text-style';
import Youtube from '@tiptap/extension-youtube';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { youtubeEmbedUrl, youtubeAttributes } from './editor-format.mjs';

// Saved posts contain plain iframe HTML; accept it as a Tiptap YouTube node too.
const CommunityYoutube = Youtube.extend({
  parseHTML() {
    return [
      {
        tag: 'iframe',
        getAttrs: (element) => (youtubeEmbedUrl(element.getAttribute('src')) ? null : false),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src = youtubeEmbedUrl(HTMLAttributes.src);
    if (!src) return ['p'];
    const url = new URL(src);
    if (
      Number.isInteger(HTMLAttributes.start) &&
      HTMLAttributes.start > 0 &&
      HTMLAttributes.start <= 604800
    )
      url.searchParams.set('start', String(HTMLAttributes.start));
    return ['div', { 'data-youtube-video': '' }, ['iframe', youtubeAttributes(url.href)]];
  },
});
const Emoticon = Node.create({
  name: 'emoticon',
  priority: 110,
  inline: true,
  group: 'inline',
  atom: true,
  addAttributes() {
    return { id: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: 'img',
        getAttrs: (element) => {
          const item = emoticonForSrc(element.getAttribute('src'));
          return item ? { id: item.id } : false;
        },
      },
    ];
  },
  renderHTML({ node }) {
    const item = emoticonForId(node.attrs.id);
    return item
      ? [
          'img',
          { src: item.src, alt: item.label, class: 'post-emoticon', 'data-emoticon': item.id },
        ]
      : ['span'];
  },
  renderText({ node }) {
    return emoticonForId(node.attrs.id)?.token || '';
  },
});

export function communityEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        protocols: ['https', 'http'],
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    TextStyle,
    Emoticon,
    FontSize,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ allowBase64: true }),
    CommunityYoutube.configure({ nocookie: true, autoplay: false, addPasteHandler: false }),
    Placeholder.configure({ placeholder: '이야기를 적거나 유튜브 주소를 붙여넣어보세요.' }),
  ];
}
