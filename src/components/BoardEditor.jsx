'use client';
import PollEditor from './PollEditor';
import PhotoPostEditor from './PhotoPostEditor';
import {ActionLink,Button,Input,Label,Select} from './ui';


import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Icon from './Icon';
import RichTextEditor from './RichTextEditor';
import AiPolish from './AiPolish';

export default function BoardEditor(props) {
  return props.board === 'helstagram' ? <PhotoPostEditor key={props.id || 'new'} id={props.id}/> : <StandardBoardEditor {...props}/>;
}

function StandardBoardEditor({ board, id = null }) {
  const config = boards[board];
  const { addPost, notify, posts, api, refresh } = useCommunity();
  const current = id ? posts[board].find(post => post.id === id) : null;
  const router = useRouter();
  const editor = useRef(null);
  const [poll, setPoll] = useState(null);
  const [category, setCategory] = useState(config.categories[0]);
  const [title, setTitle] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  useEffect(() => {
    if (!current) return;
    setTitle(current.title); setCategory(current.category); setPinned(Boolean(current.pinned));
  }, [current?.id]);

  async function publish(event) {
    event.preventDefault();
    if (busy || processingImages) return;
    const {content:body,images,bodyHtml} = editor.current.getDraft();
    if (!title.trim() || (!body && !images.length)) { setError('제목과 본문을 입력해주세요.'); return; }
    setBusy(true);setError('');
    try {
      const draft={title:title.trim(),category,...(board === 'notice' ? {pinned} : {}),content:body,bodyHtml,images,...(!id ? {poll:poll ? {...poll,endsAt:poll.endsAt ? new Date(`${poll.endsAt}:00+09:00`).toISOString() : null} : null} : {})};
      if(id){await api(`posts/${id}`,{method:'PATCH',body:draft});await refresh();}
      else await addPost(board,draft);
      notify(id?'게시글을 수정했습니다.':'게시글을 등록했습니다.');router.push(`/boards/${board}`);
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <AccessGate operator={board === 'notice'}><section className="editor-page"><IdentityStrip /><Link className="back-link" href={`/boards/${board}`}><Icon name="back" size={16} />{config.label} 목록으로</Link><header className="page-heading"><div><div className="eyebrow">{board === 'notice' ? 'COMMAND ANNOUNCEMENT' : 'SHARE YOUR INTEL'}</div><h1>{id ? '게시글 수정' : board === 'notice' ? '새 공지 작성' : board === 'guide' ? '공략 나누기' : board === 'qna' ? '동료에게 질문하기' : '오늘의 이야기'}</h1><p>{board === 'notice' ? '대원들에게 필요한 소식을 전해주세요.' : board === 'qna' ? '궁금한 상황과 시도한 방법을 함께 적어주세요.' : '동료들과 나눌 이야기를 들려주세요.'}</p></div></header><form className="editor-paper" onSubmit={publish}><div className="editor-fields"><div className="field"><Label htmlFor="category">분류 <span>*</span></Label><Select id="category" value={category} onChange={event => setCategory(event.target.value)}>{config.categories.map(value => <option key={value}>{value}</option>)}</Select></div><div className="field"><Label htmlFor="post-title">제목 <span>*</span></Label><Input id="post-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="제목을 입력해주세요" required /></div></div>
    {board === 'notice' && <div className="notice-pin-option"><Label className="checkbox-label" htmlFor="notice-pinned"><Input id="notice-pinned" type="checkbox" checked={pinned} onChange={event => setPinned(event.target.checked)} /><span>상단에 고정하기</span></Label><p className="field-hint">체크하면 공지사항 목록의 맨 위에 표시됩니다. 고정된 글끼리는 최신순으로 표시됩니다.</p></div>}
    <Label className="field-label">본문 <span>*</span></Label><RichTextEditor key={id || board} ref={editor} initialPost={current} notify={notify} onProcessingChange={setProcessingImages}/><AiPolish board={board} disabled={busy || processingImages} getDraft={() => ({ title, ...editor.current.getAiDraft() })} applyDraft={draft => { editor.current.applyAiDraft(draft.segments); setTitle(draft.title); }}/>{(!id || current?.poll) && <PollEditor value={poll} onChange={setPoll} existing={current?.poll} />}{board === 'notice' && <p className="muted-callout">운영자·부운영자 전용 작성 화면입니다.</p>}<p className="form-error" role="alert">{error}</p><footer className="editor-footer"><span>* 필수 입력 항목</span><div><ActionLink className="button secondary" href={`/boards/${board}`}>취소</ActionLink><Button type="submit" className="button primary" disabled={busy}>{busy ? '저장 중…' : id ? '수정 완료' : board === 'notice' ? '공지 등록' : board === 'guide' ? '공략 등록' : '게시하기'} <Icon name="arrow" size={16} /></Button></div></footer></form>

  </section></AccessGate>;
}
