'use client';
import { useState } from 'react';
import Modal from './Modal';
import { Button, Input, Label } from './ui';
import Icon from './Icon';
import { emptyBoardFilters } from '@/lib/board-search.mjs';
import BoardDateRangePicker from './BoardDateRangePicker';

export default function BoardSearchFilter({ value, onApply, onClose }) {
  const [draft, setDraft] = useState({ ...value });
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);
  const field = (key, next) => setDraft((current) => ({ ...current, [key]: next }));
  return (
    <Modal title="게시글 검색 필터" onClose={onClose}>
      <form
        className="board-filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid)
            onApply(
              Object.fromEntries(Object.entries(draft).map(([key, text]) => [key, text.trim()])),
            );
        }}
      >
        <p className="board-filter-help">
          입력한 조건을 모두 만족하는 게시글을 찾습니다. 날짜는 한국 시간 기준이며 시작일과 종료일을
          포함합니다.
        </p>
        <fieldset className="board-filter-dates board-filter-range">
          <legend>작성 날짜</legend>
          <BoardDateRangePicker
            from={draft.from}
            to={draft.to}
            onChange={(dates) => setDraft((current) => ({ ...current, ...dates }))}
          />
        </fieldset>
        {[
          ['author', '작성자', '닉네임을 입력하세요'],
          ['title', '제목', '제목에 포함된 단어'],
          ['content', '내용', '본문에 포함된 단어'],
        ].map(([key, label, placeholder]) => (
          <div className="board-filter-field" key={key}>
            <Label htmlFor={`filter-${key}`}>{label}</Label>
            <Input
              id={`filter-${key}`}
              value={draft[key]}
              placeholder={placeholder}
              onChange={(event) => field(key, event.target.value)}
              maxLength={100}
            />
          </div>
        ))}
        {invalid && (
          <p className="form-error" role="alert">
            종료일은 시작일 이후로 선택해주세요.
          </p>
        )}
        <div className="board-filter-actions">
          <Button type="button" onClick={() => setDraft({ ...emptyBoardFilters })}>
            초기화
          </Button>
          <Button type="button" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" className="primary" disabled={invalid}>
            <Icon name="search" size={17} />
            검색 적용
          </Button>
        </div>
      </form>
    </Modal>
  );
}
