'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button, Input, Label, TextArea } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import { cleanEditorHtml } from '@/lib/editor-html';
import { minFontSize, maxFontSize, youtubeEmbedUrl, youtubeAttributes } from '@/lib/editor-format.mjs';

const RichTextEditor = forwardRef(function RichTextEditor({ initialPost, notify }, ref) {
  const editor = useRef(null), imageInput = useRef(null), selection = useRef(null), initialized = useRef(false), pendingSize = useRef(14);
  const [sourceMode, setSourceMode] = useState(false), [source, setSource] = useState('');
  const [fontSize, setFontSize] = useState('14'), [dialog, setDialog] = useState(null), [url, setUrl] = useState(''), [dialogError, setDialogError] = useState('');
  useEffect(() => {
    if (!initialPost || initialized.current || !editor.current) return;
    initialized.current = true;
    if (initialPost.bodyHtml) editor.current.innerHTML = cleanEditorHtml(initialPost.bodyHtml);
    else { editor.current.textContent = initialPost.content; for (const src of initialPost.images || []) { const image = document.createElement('img'); image.src = src; image.alt = '본문 이미지'; editor.current.append(image); } }
  }, [initialPost]);
  useImperativeHandle(ref, () => ({ getDraft() {
    const bodyHtml = cleanEditorHtml(sourceMode ? source : editor.current.innerHTML);
    const root = document.createElement('div'); root.innerHTML = bodyHtml;
    const images = [...root.querySelectorAll('img')].map(image => image.getAttribute('src'));
    const video = root.querySelector('iframe');
    for (const line of root.querySelectorAll('br')) line.replaceWith(document.createTextNode('\n'));
    for (const block of root.querySelectorAll('p,div,li,h2,h3,blockquote')) block.append(document.createTextNode('\n'));
    return { bodyHtml, images, content: root.textContent.trim() || (video ? 'YouTube 동영상' : '') };
  } }), [sourceMode, source]);
  function rememberSelection() {
    const selected = window.getSelection();
    if (selected?.rangeCount && editor.current?.contains(selected.getRangeAt(0).commonAncestorContainer)) selection.current = selected.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    editor.current.focus(); const selected = window.getSelection(); selected.removeAllRanges();
    if (selection.current && editor.current.contains(selection.current.commonAncestorContainer)) selected.addRange(selection.current);
    else { const range = document.createRange(); range.selectNodeContents(editor.current); range.collapse(false); selected.addRange(range); }
  }
  function insertHtml(html) { restoreSelection(); document.execCommand('insertHTML', false, html); rememberSelection(); }
  function format(command) { restoreSelection(); document.execCommand(command, false, null); rememberSelection(); }
  function normalizeFont() {
    for (const font of editor.current.querySelectorAll('font[size="7"]')) { font.style.fontSize = `${pendingSize.current}px`; font.removeAttribute('size'); }
  }
  function applyFontSize() {
    const size = Number(fontSize);
    if (!Number.isInteger(size) || size < minFontSize || size > maxFontSize) { notify('글자 크기는 12~72px 사이의 정수로 입력해주세요.'); return; }
    pendingSize.current = size; restoreSelection(); document.execCommand('styleWithCSS', false, false); document.execCommand('fontSize', false, '7'); normalizeFont(); rememberSelection();
  }
  function toggleSource() {
    if (sourceMode) { editor.current.innerHTML = cleanEditorHtml(source); selection.current = null; }
    else { rememberSelection(); setSource(editor.current.innerHTML); }
    setSourceMode(current => !current);
  }
  function showDialog(type) { rememberSelection(); setDialog(type); setUrl(''); setDialogError(''); }
  function submitUrl(event) {
    event.preventDefault(); event.stopPropagation();
    if (dialog === 'youtube') {
      const src = youtubeEmbedUrl(url);
      if (!src) { setDialogError('유효한 유튜브 동영상 주소를 입력해주세요.'); return; }
      const frame = document.createElement('iframe'); for (const [key,value] of Object.entries(youtubeAttributes(src))) frame.setAttribute(key,value);
      insertHtml(`${frame.outerHTML}<p><br></p>`);
    } else {
      let value; try { value = new URL(url); } catch { setDialogError('올바른 웹 주소를 입력해주세요.'); return; }
      if (!['http:','https:'].includes(value.protocol)) { setDialogError('http 또는 https 주소를 입력해주세요.'); return; }
      const anchor = document.createElement('a'); anchor.href = value.href; anchor.textContent = value.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; insertHtml(`${anchor.outerHTML}<br>`);
    }
    setDialog(null);
  }
  function insertImage(event) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) { notify('JPG·PNG·WebP 형식의 5MB 이하 이미지를 선택해주세요.'); return; }
    const reader = new FileReader(); reader.onload = () => { const image = document.createElement('img'); image.src = reader.result; image.alt = '본문 이미지'; insertHtml(`${image.outerHTML}<br>`); }; reader.readAsDataURL(file); event.target.value = '';
  }
  function paste(event) {
    const text = event.clipboardData.getData('text/plain').trim(), html = event.clipboardData.getData('text/html');
    const video = youtubeEmbedUrl(text);
    if (video) { event.preventDefault(); rememberSelection(); const frame = document.createElement('iframe'); for (const [key,value] of Object.entries(youtubeAttributes(video))) frame.setAttribute(key,value); insertHtml(`${frame.outerHTML}<p><br></p>`); }
    else if (html) { event.preventDefault(); rememberSelection(); insertHtml(cleanEditorHtml(html)); }
  }
  return <div className="rich-text-composer">
    <div className="editor-toolbar" aria-label="본문 편집 도구">
      <div className="editor-mode-switch"><Button type="button" aria-pressed={!sourceMode} onClick={() => sourceMode && toggleSource()}>일반 편집</Button><Button type="button" aria-pressed={sourceMode} onClick={() => !sourceMode && toggleSource()}><Icon name="code" size={16}/>HTML 소스</Button></div>
      <div className="editor-format-controls" aria-disabled={sourceMode}>
        {[['bold','굵게'],['italic','기울임'],['underline','밑줄']].map(([command,label]) => <Button key={command} type="button" aria-label={label} disabled={sourceMode} onMouseDown={e=>e.preventDefault()} onClick={()=>format(command)}><Icon name={command} size={16}/></Button>)}
        <div className="editor-font-size"><Input type="number" aria-label="글자 크기" min={minFontSize} max={maxFontSize} step="1" value={fontSize} disabled={sourceMode} onChange={e=>setFontSize(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyFontSize();}}}/><span>px</span><Button type="button" disabled={sourceMode} onClick={applyFontSize}>적용</Button></div>
        <Button type="button" disabled={sourceMode} onMouseDown={e=>e.preventDefault()} onClick={()=>format('insertUnorderedList')}><Icon name="list" size={16}/>목록</Button>
        <Button type="button" disabled={sourceMode} onClick={()=>showDialog('link')}><Icon name="link" size={16}/>링크</Button>
        <Button type="button" disabled={sourceMode} onClick={()=>{rememberSelection();imageInput.current.click();}}><Icon name="image" size={16}/>이미지</Button>
        <Button type="button" disabled={sourceMode} onClick={()=>showDialog('youtube')}><Icon name="video" size={16}/>유튜브</Button>
      </div>
    </div>
    <div ref={editor} className="rich-editor" hidden={sourceMode} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="본문" data-placeholder="이야기를 적거나 유튜브 주소를 붙여넣어보세요." onMouseUp={rememberSelection} onKeyUp={rememberSelection} onBlur={rememberSelection} onInput={()=>{normalizeFont();rememberSelection();}} onPaste={paste} onDrop={event=>event.preventDefault()}/>
    {sourceMode && <><TextArea className="editor-source" aria-label="HTML 소스 입력" value={source} onChange={e=>setSource(e.target.value)} spellCheck={false} rows={16}/><p className="field-hint">HTML을 입력하고 ‘일반 편집’으로 확인하세요. 스크립트와 유튜브 외 iframe 등은 저장 시 제거됩니다.</p></>}
    <Input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={insertImage} tabIndex={-1} aria-label="본문 이미지 선택"/>
    <p className="field-hint">글자 크기 12~72px · 1px 단위 / 유튜브 주소만 붙여넣어도 동영상 삽입 / 이미지는 최대 5개, 파일당 5MB</p>
    {dialog && <Modal title={dialog==='youtube'?'유튜브 동영상 넣기':'본문에 링크 넣기'} onClose={()=>setDialog(null)}><form onSubmit={submitUrl}><Label htmlFor="editor-media-url">{dialog==='youtube'?'유튜브 동영상 주소':'웹 주소'}</Label><Input id="editor-media-url" type="url" placeholder={dialog==='youtube'?'https://www.youtube.com/watch?v=…':'https://'} value={url} onChange={e=>{setUrl(e.target.value);setDialogError('');}} required autoFocus/>{dialog==='youtube'&&<p className="field-hint">일반 동영상, youtu.be 단축 링크, Shorts, 라이브 링크를 사용할 수 있어요.</p>}<p className="form-error" role="alert">{dialogError}</p><div className="form-actions"><Button type="submit" className="button primary">{dialog==='youtube'?'동영상 삽입':'링크 삽입'}</Button></div></form></Modal>}
  </div>;
});
export default RichTextEditor;
