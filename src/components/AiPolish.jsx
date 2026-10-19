'use client';
import { useRef, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
import Modal from './Modal';

const enabled = false;

export default function AiPolish({ board, getDraft, applyDraft, disabled }) {
  const { api, notify } = useCommunity();
  const [busy, setBusy] = useState(false), [preview, setPreview] = useState(null), [error, setError] = useState('');
  const running = useRef(false);
  async function polish() {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      const original = getDraft();
      const result = await api('ai/polish', { method: 'POST', body: { board, title: original.title, segments: original.segments } });
      setPreview({ original, result });
    } catch (error) { setError(error.message); }
    finally { running.current = false; setBusy(false); }
  }
  function apply() {
    if (JSON.stringify(getDraft()) !== JSON.stringify(preview.original)) { setError('보정 요청 후 원문이 변경되었습니다. 현재 내용으로 다시 보정해주세요.'); setPreview(null); return; }
    try { applyDraft(preview.result); setPreview(null); notify('AI 보정을 적용했습니다. 내용을 확인한 뒤 저장해주세요.'); }
    catch (error) { setError(error.message); }
  }
  if (!enabled) return null;
  return <div className="ai-polish">
    <Button type="button" disabled={disabled || busy} onClick={polish}>{busy ? 'AI가 다듬는 중…' : 'AI 내용 보정'}</Button>
    <p className="field-hint">맞춤법과 문장 흐름을 다듬습니다. 제목·본문 텍스트를 OpenAI로 전송하며, 결과 확인 후 적용할 수 있어요. 본문 최대 10,000자.</p>
    <p className="form-error" role="alert">{error}</p>
    {preview && <Modal title="AI 내용 보정 미리보기" onClose={() => setPreview(null)} footer={<><Button type="button" onClick={() => setPreview(null)}>취소</Button><Button type="button" className="button primary" disabled={disabled} onClick={apply}>보정 적용</Button></>}>
      <p className="field-hint">의미와 게임 정보가 올바른지 확인해주세요. 적용 후 게시글을 저장해야 반영됩니다.</p>
      <div className="ai-polish-comparison">{[['원문', preview.original], ['보정 결과', preview.result]].map(([label, draft]) => <section key={label}><h3>{label}</h3><h4>{draft.title || '(제목 없음)'}</h4><div className="ai-polish-text">{draft.segments.join('\n') || '(본문 없음)'}</div></section>)}</div>
    </Modal>}
  </div>;
}
