// Work only with text nodes: media URLs and formatting never leave the editor.
function textNodes(root) {
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.trim() && !node.parentElement.closest('script,style,iframe,pre,code'))
      nodes.push(node);
  }
  return nodes;
}
export function htmlTextSegments(html, document) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return textNodes(root).map((node) => node.textContent);
}
export function replaceHtmlText(html, segments, document) {
  const root = document.createElement('div');
  root.innerHTML = html;
  const nodes = textNodes(root);
  if (nodes.length !== segments.length) throw Error('본문이 변경되었습니다. 다시 보정해주세요.');
  nodes.forEach((node, index) => {
    node.textContent = segments[index];
  });
  return root.innerHTML;
}
