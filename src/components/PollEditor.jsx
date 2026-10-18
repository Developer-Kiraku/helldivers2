'use client';
import { Button, Input, Label } from './ui';
import Icon from './Icon';
import PollDeadlinePicker from './PollDeadlinePicker';

export default function PollEditor({ value, onChange, existing }) {
  if (existing) return <div className="poll-editor"><h3><Icon name="poll" />첨부된 투표</h3><p>{existing.question}</p><p className="field-hint">참여 결과를 보존하기 위해 등록된 투표는 수정할 수 없습니다. 본문은 자유롭게 수정할 수 있습니다.</p></div>;
  if (!value) return <Button type="button" className="button secondary poll-add" onClick={() => onChange({ question: '', options: ['', ''], multiple: false, anonymous: false, endsAt: '' })}><Icon name="poll" size={18} />투표 추가</Button>;
  const change = patch => onChange({ ...value, ...patch });
  return <section className="poll-editor" aria-labelledby="poll-editor-title"><header className="poll-heading"><h3 id="poll-editor-title"><Icon name="poll" />투표 만들기</h3><Button type="button" onClick={() => onChange(null)}><Icon name="close" size={16} />투표 제거</Button></header>
    <Label htmlFor="poll-question">투표 제목</Label><Input id="poll-question" value={value.question} onChange={event => change({ question: event.target.value })} maxLength={100} placeholder="어떤 의견을 나눌까요?" required />
    <div className="poll-editor-options">{value.options.map((option, index) => <div className="poll-editor-option" key={index}><span>{index + 1}</span><Input aria-label={`투표 항목 ${index + 1}`} value={option} onChange={event => change({ options: value.options.map((text, i) => i === index ? event.target.value : text) })} placeholder={`항목 ${index + 1}`} maxLength={100} required /><Button type="button" aria-label={`투표 항목 ${index + 1} 삭제`} disabled={value.options.length <= 2} onClick={() => change({ options: value.options.filter((_, i) => i !== index) })}><Icon name="close" size={16} /></Button></div>)}</div>
    <Button type="button" disabled={value.options.length >= 20} onClick={() => change({ options: [...value.options, ''] })}><Icon name="plus" size={16} />항목 추가 ({value.options.length}/20)</Button>
    <div className="poll-settings"><Label><Input type="checkbox" checked={value.multiple} onChange={event => change({ multiple: event.target.checked })} />복수 선택</Label><Label><Input type="checkbox" checked={value.anonymous} onChange={event => change({ anonymous: event.target.checked })} />익명 투표</Label><Label htmlFor="poll-deadline">마감 일시 (선택 · 한국 시간)</Label><PollDeadlinePicker id="poll-deadline" value={value.endsAt} onChange={endsAt => change({ endsAt })} /></div>
    <p className="field-hint">등록 후에는 항목과 설정을 바꿀 수 없습니다. 마감 전까지 재투표와 취소가 가능합니다.</p>
  </section>;
}
