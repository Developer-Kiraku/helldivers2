'use client';
import PollEditor from './PollEditor';
import {ActionLink,Button,Input,Label,Select} from './ui';


import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Icon from './Icon';
import Modal from './Modal';

export default function BoardEditor({ board, id = null }) {
  const config = boards[board];
  const { addPost, notify, posts, api, refresh } = useCommunity();
  const current = id ? posts[board].find(post => post.id === id) : null;
  const initialized = useRef(false);
  const router = useRouter();
  const editor = useRef(null);
  const imageInput = useRef(null);
  const [poll, setPoll] = useState(null);
  const [category, setCategory] = useState(config.categories[0]);
  const [title, setTitle] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');
  const [linkDialog, setLinkDialog] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!current || initialized.current || !editor.current) return;
    initialized.current = true; setTitle(current.title); setCategory(current.category); setPinned(Boolean(current.pinned));
    if (current.bodyHtml) editor.current.innerHTML = current.bodyHtml;
    else { editor.current.textContent = current.content; for (const src of current.images || []) { const image=document.createElement('img');image.src=src;image.alt='본문 이미지';editor.current.append(image); } }
  }, [current]);

  function format(command) { editor.current.focus(); document.execCommand(command, false, null); }
  function insertLink(event) {
    event.preventDefault();
    let url;
    try { url = new URL(link); } catch { notify('올바른 웹 주소를 입력해주세요.'); return; }
    if (!['http:', 'https:'].includes(url.protocol)) { notify('http 또는 https 주소만 입력할 수 있습니다.'); return; }
    const anchor = document.createElement('a'); anchor.href = url.href; anchor.textContent = url.href; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
    editor.current.append(anchor, document.createElement('br')); setLinkDialog(false); setLink('');
  }
  function insertImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { notify('JPG·PNG·WebP 형식의 5MB 이하 이미지를 선택해주세요.'); return; }
    const reader = new FileReader(); reader.onload = () => { const image = document.createElement('img'); image.src = reader.result; image.alt = '본문에 삽입한 이미지'; editor.current.append(image, document.createElement('br')); }; reader.readAsDataURL(file); event.target.value = '';
  }
  async function publish(event) {
    event.preventDefault();
    const body = editor.current.innerText.trim();
    const images = Array.from(editor.current.querySelectorAll('img')).map(image => image.getAttribute('src'));
    if (!title.trim() || (!body && !images.length)) { setError('제목과 본문을 입력해주세요.'); return; }
    setBusy(true);setError('');
    try {
      const draft={title:title.trim(),category,...(board === 'notice' ? {pinned} : {}),content:body,bodyHtml:editor.current.innerHTML,images,...(!id ? {poll:poll ? {...poll,endsAt:poll.endsAt ? new Date(`${poll.endsAt}:00+09:00`).toISOString() : null} : null} : {})};
      if(id){await api(`posts/${id}`,{method:'PATCH',body:draft});await refresh();}
      else await addPost(board,draft);
      notify(id?'게시글을 수정했습니다.':'게시글을 등록했습니다.');router.push(`/boards/${board}`);
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <AccessGate operator={board === 'notice'}><section className="editor-page"><IdentityStrip /><Link className="back-link" href={`/boards/${board}`}><Icon name="back" size={16} />{config.label} 목록으로</Link><header className="page-heading"><div><div className="eyebrow">{board === 'notice' ? 'COMMAND ANNOUNCEMENT' : 'SHARE YOUR INTEL'}</div><h1>{id ? '게시글 수정' : board === 'notice' ? '새 공지 작성' : board === 'guide' ? '공략 나누기' : board === 'qna' ? '동료에게 질문하기' : '오늘의 이야기'}</h1><p>{board === 'notice' ? '대원들에게 필요한 소식을 전해주세요.' : board === 'qna' ? '궁금한 상황과 시도한 방법을 함께 적어주세요.' : '동료들과 나눌 이야기를 들려주세요.'}</p></div></header><form className="editor-paper" onSubmit={publish}><div className="editor-fields"><div className="field"><Label htmlFor="category">분류 <span>*</span></Label><Select id="category" value={category} onChange={event => setCategory(event.target.value)}>{config.categories.map(value => <option key={value}>{value}</option>)}</Select></div><div className="field"><Label htmlFor="post-title">제목 <span>*</span></Label><Input id="post-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="제목을 입력해주세요" required /></div></div>
    {board === 'notice' && <div className="notice-pin-option"><Label className="checkbox-label" htmlFor="notice-pinned"><Input id="notice-pinned" type="checkbox" checked={pinned} onChange={event => setPinned(event.target.checked)} /><span>상단에 고정하기</span></Label><p className="field-hint">체크하면 공지사항 목록의 맨 위에 표시됩니다. 고정된 글끼리는 최신순으로 표시됩니다.</p></div>}
    <Label className="field-label" id="editor-label">본문 <span>*</span></Label><div className="editor-toolbar" aria-label="본문 편집 도구"><Button type="button" aria-label="굵게" onMouseDown={event => event.preventDefault()} onClick={() => format('bold')}><Icon name="bold" size={16} /></Button><Button type="button" aria-label="기울임" onMouseDown={event => event.preventDefault()} onClick={() => format('italic')}><Icon name="italic" size={16} /></Button><Button type="button" aria-label="밑줄" onMouseDown={event => event.preventDefault()} onClick={() => format('underline')}><Icon name="underline" size={16} /></Button><Button type="button" onClick={() => format('insertUnorderedList')}><Icon name="list" size={16} />목록</Button><span /><Button type="button" onClick={() => setLinkDialog(true)}><Icon name="link" size={15} />링크</Button><Button type="button" onClick={() => imageInput.current.click()}><Icon name="image" size={16} />이미지</Button></div><div ref={editor} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-labelledby="editor-label" data-placeholder="동료들과 나눌 이야기를 작성해주세요. 링크와 이미지는 에디터에서 넣을 수 있습니다." /><Input ref={imageInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={insertImage} tabIndex={-1} aria-label="본문 이미지 선택" /><p className="field-hint">이미지는 본문 에디터에서 최대 5개까지 삽입할 수 있습니다. 이미지당 최대 5MB입니다.</p>{(!id || current?.poll) && <PollEditor value={poll} onChange={setPoll} existing={current?.poll} />}{board === 'notice' && <p className="muted-callout">운영자·부운영자 전용 작성 화면입니다.</p>}<p className="form-error" role="alert">{error}</p><footer className="editor-footer"><span>* 필수 입력 항목</span><div><ActionLink className="button secondary" href={`/boards/${board}`}>취소</ActionLink><Button type="submit" className="button primary" disabled={busy}>{busy ? '저장 중…' : id ? '수정 완료' : board === 'notice' ? '공지 등록' : board === 'guide' ? '공략 등록' : '게시하기'} <Icon name="arrow" size={16} /></Button></div></footer></form>
    {linkDialog && <Modal title="본문에 링크 넣기" onClose={() => setLinkDialog(false)}><form onSubmit={insertLink}><Label className="field-label" htmlFor="editor-url">웹 주소</Label><Input className="text-input" id="editor-url" type="url" placeholder="https://" value={link} onChange={event => setLink(event.target.value)} required autoFocus /><div className="form-actions"><Button className="button primary">링크 삽입</Button></div></form></Modal>}
  </section></AccessGate>;
}
