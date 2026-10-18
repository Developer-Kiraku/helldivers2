'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui';
import { useCommunity } from './CommunityProvider';
import Icon from './Icon';

export default function PostPoll({ post }) {
  const { api, notify } = useCommunity();
  const [poll, setPoll] = useState(post.poll);
  const [choices, setChoices] = useState(post.poll.myChoices);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmClose, setConfirmClose] = useState(false);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    let alive = true;
    const timer = setInterval(() => { setClock(Date.now()); api(`posts/${post.id}`).then(data => { if (alive) setPoll(data.post.poll); }).catch(() => {}); }, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [api, post.id]);
  const closed = poll.closed || Boolean(poll.endsAt && Date.parse(poll.endsAt) <= clock);
  async function submit(nextChoices, close = false) {
    setBusy(true); setError('');
    try {
      const data = await api(`posts/${post.id}/poll`, { method: close ? 'PATCH' : 'POST', body: close ? { close: true } : { choices: nextChoices } });
      setPoll(data.poll); setChoices(data.poll.myChoices); setConfirmClose(false);
      notify(close ? '투표를 마감했습니다.' : nextChoices.length ? '투표를 반영했습니다.' : '투표를 취소했습니다.');
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="post-poll" aria-labelledby={`poll-${post.id}`}><header className="poll-heading"><span className={`poll-state ${closed ? 'closed' : ''}`}><Icon name="poll" size={15} />{closed ? '투표 마감' : '투표 진행 중'}</span><span className="poll-count"><Icon name="user" size={15} />{poll.totalVoters}명 참여</span></header>
    <h2 id={`poll-${post.id}`}>{poll.question}</h2><p className="poll-description">{poll.multiple ? '복수 선택 가능' : '한 항목 선택'} · {poll.anonymous ? '익명 투표' : '공개 투표'}{poll.endsAt && <> · {new Date(poll.endsAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST 마감</>}</p>
    <fieldset className="poll-options" disabled={busy || closed}><legend className="sr-only">투표 항목 선택</legend>{poll.options.map(option => {
      const percent = poll.totalVoters ? Math.round(option.count / poll.totalVoters * 100) : 0;
      return <div key={option.id}><label className={`poll-option ${choices.includes(option.id) ? 'selected' : ''}`}><span className="poll-bar" style={{ width: `${percent}%` }} /><input type={poll.multiple ? 'checkbox' : 'radio'} name={`poll-choice-${post.id}`} checked={choices.includes(option.id)} onChange={() => setChoices(current => poll.multiple ? current.includes(option.id) ? current.filter(id => id !== option.id) : [...current, option.id] : [option.id])} /><span className="poll-option-text">{option.text}{poll.myChoices.includes(option.id) && <small>내 선택</small>}</span><strong>{option.count}표 <small>{percent}%</small></strong></label>{!poll.anonymous && option.voters.length > 0 && <details className="poll-voters"><summary>참여자 {option.count}명</summary><p>{option.voters.join(', ')}</p></details>}</div>;
    })}</fieldset>
    {!closed && <div className="poll-actions"><Button type="button" className="button primary" disabled={busy || !choices.length} onClick={() => submit(choices)}><Icon name="check" size={16} />{busy ? '처리 중…' : poll.myChoices.length ? '다시 투표하기' : '투표하기'}</Button>{poll.myChoices.length > 0 && <Button type="button" disabled={busy} onClick={() => submit([])}>투표 취소</Button>}{post.own && <Button type="button" disabled={busy} onClick={() => setConfirmClose(true)}>투표 마감</Button>}</div>}
    {confirmClose && !closed && <div className="poll-close-confirm"><p>투표를 마감하면 다시 열 수 없습니다. 마감할까요?</p><Button type="button" disabled={busy} onClick={() => submit([], true)}>마감 확정</Button><Button type="button" disabled={busy} onClick={() => setConfirmClose(false)}>돌아가기</Button></div>}
    {closed && <p className="field-hint">마감된 투표입니다. 최종 결과를 확인할 수 있습니다.</p>}<p className="form-error" role="alert">{error}</p>
  </section>;
}
