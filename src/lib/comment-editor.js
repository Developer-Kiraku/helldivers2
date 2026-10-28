import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Emoticon, Equipment } from './tiptap-extensions.js';
import { emoticonParts, emoticonForId } from './emoticons.mjs';
import { equipmentParts, equipmentForId } from './equipment.mjs';

export function commentDocument(value = '') {
  return {
    type: 'doc',
    content: value.split('\n').map((line) => ({
      type: 'paragraph',
      content: emoticonParts(line).flatMap((part) =>
        part.emoticon
          ? [{ type: 'emoticon', attrs: { id: part.emoticon.id } }]
          : equipmentParts(part.text).flatMap((piece) =>
              piece.equipment
                ? [{ type: 'equipment', attrs: { id: piece.equipment.id } }]
                : piece.text
                  ? [{ type: 'text', text: piece.text }]
                  : [],
            ),
      ),
    })),
  };
}
export function commentText(doc) {
  const inline = (node) =>
    node.type === 'text'
      ? node.text
      : node.type === 'hardBreak'
        ? '\n'
        : node.type === 'emoticon'
          ? emoticonForId(node.attrs.id)?.token || ''
          : node.type === 'equipment'
            ? equipmentForId(node.attrs.id)?.token || ''
            : (node.content || []).map(inline).join('');
  return (doc.content || []).map(inline).join('\n');
}
export function commentExtensions(maxLength) {
  return [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      bold: false,
      italic: false,
      strike: false,
      underline: false,
      link: false,
      trailingNode: false,
    }),
    Emoticon,
    Equipment,
    Extension.create({
      name: 'commentLength',
      addProseMirrorPlugins() {
        return [
          new Plugin({
            filterTransaction(tr, state) {
              if (!tr.docChanged || !maxLength) return true;
              const length = commentText(tr.doc.toJSON()).length;
              return length <= maxLength || length < commentText(state.doc.toJSON()).length;
            },
          }),
        ];
      },
    }),
  ];
}
