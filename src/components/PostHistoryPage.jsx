'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label, Select } from './ui';
import Modal from './Modal';
import { boards } from '@/lib/data';
import { isStaff } from '@/lib/roles';

const actions = {
  'post.update': '수정',
  'post.delete': '삭제',
  'post.delete.approved': '승인 후 삭제',
};
const fields = {
  title: '제목',
  category: '분류',
  content: '본문',
  bodyHash: '본문 서식·첨부',
  images: '이미지',
  youtubeUrl: '유튜브',
  pinned: '상단 고정',
};
const date = (value) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
function Snapshot({ title, value }) {
  return (
    <section className="post-history-snapshot">
      <h3>{title}</h3>
      {!value ? (
        <p>이 기록에는 당시 내용이 저장되어 있지 않습니다.</p>
      ) : (
        <>
          <dl className="member-info">
            <dt>제목</dt>
            <dd>{value.title}</dd>
            <dt>게시판·분류</dt>
            <dd>
              {boards[value.board]?.label || value.board} · {value.category}
            </dd>
            <dt>첨부 이미지</dt>
            <dd>{value.images.length}장</dd>
            <dt>유튜브</dt>
            <dd>{value.youtubeUrl || '없음'}</dd>
            <dt>상단 고정</dt>
            <dd>{value.pinned ? '예' : '아니요'}</dd>
          </dl>
          <h4>본문</h4>
          <p className="preserve-lines">{value.content || '텍스트 본문 없음'}</p>
        </>
      )}
    </section>
  );
}
export default function PostHistoryPage() {
  const { api, role } = useCommunity();
  const [action, setAction] = useState('all'),
    [board, setBoard] = useState('all');
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState('');
  const [page, setPage] = useState(1),
    [data, setData] = useState(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [selected, setSelected] = useState(null),
    [log, setLog] = useState(null);
  const [detailError, setDetailError] = useState('');
  useEffect(() => {
    if (!isStaff(role)) return;
    let alive = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      action: action === 'all' ? '' : action,
      board: board === 'all' ? '' : board,
      q: query,
      page: String(page),
    });
    api(`admin/post-history?${params}`)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((error) => {
        if (alive) setError(error.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, role, action, board, query, page]);
  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setLog(null);
    setDetailError('');
    api(`admin/post-history/${selected}`)
      .then((result) => {
        if (alive) setLog(result.log);
      })
      .catch((error) => {
        if (alive) setDetailError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [api, selected]);
  if (!isStaff(role))
    return (
      <section className="access-panel">
        <h1>운영진 전용입니다.</h1>
      </section>
    );
  return (
    <section className="admin-page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">POST HISTORY</div>
          <h1>게시글 변경 이력</h1>
          <p>게시글 수정·삭제 작업과 당시 내용을 확인합니다. 시간은 한국 시간입니다.</p>
        </div>
      </header>
      <form
        className="post-history-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(draft.trim());
        }}
      >
        <Label>
          작업 종류
          <Select
            aria-label="작업 종류"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">전체</option>
            {Object.entries(actions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          게시판
          <Select
            aria-label="게시판"
            value={board}
            onChange={(event) => {
              setBoard(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">전체 게시판</option>
            {Object.entries(boards).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          제목·작업자 검색
          <Input
            value={draft}
            maxLength={100}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="제목 또는 작업자"
          />
        </Label>
        <Button type="submit">검색</Button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p role="status">{loading ? '이력을 불러오는 중…' : `총 ${data?.total || 0}건`}</p>
      {!loading && !error && data?.logs.length === 0 && (
        <div className="empty-state">조건에 맞는 변경 이력이 없습니다.</div>
      )}
      {!loading && !error && (
        <div className="request-list">
          {data?.logs.map((entry) => (
            <article className="panel request-card" key={entry.id}>
              <header>
                <span className="badge">{actions[entry.action]}</span>
                <span>{boards[entry.board]?.label || '게시판 정보 없음'}</span>
                <time>{date(entry.createdAt)}</time>
              </header>
              <h2>{entry.title}</h2>
              <p>작업자: {entry.actorNickname}</p>
              {entry.reason && <p className="request-reason">삭제 사유: {entry.reason}</p>}
              {entry.requesterNickname && <p>삭제 요청자: {entry.requesterNickname}</p>}
              <footer>
                {!entry.deleted && (
                  <Link href={`/boards/${entry.board}/${entry.postId}`}>게시글 보기</Link>
                )}
                <Button onClick={() => setSelected(entry.id)}>이력 상세</Button>
              </footer>
            </article>
          ))}
        </div>
      )}
      {data && data.pageCount > 1 && (
        <nav className="post-history-pagination" aria-label="이력 페이지">
          <Button disabled={loading || data.page <= 1} onClick={() => setPage(data.page - 1)}>
            이전
          </Button>
          <span>
            {data.page} / {data.pageCount}
          </span>
          <Button
            disabled={loading || data.page >= data.pageCount}
            onClick={() => setPage(data.page + 1)}
          >
            다음
          </Button>
        </nav>
      )}
      {selected && (
        <Modal
          title="게시글 변경 이력 상세"
          className="post-history-modal"
          onClose={() => setSelected(null)}
        >
          {detailError ? (
            <p className="form-error" role="alert">
              {detailError}
            </p>
          ) : !log ? (
            <p role="status">이력을 불러오는 중…</p>
          ) : (
            <>
              <p>
                {actions[log.action]} · {log.actorNickname} · {date(log.createdAt)}
              </p>
              {log.reason && <p className="request-reason">삭제 사유: {log.reason}</p>}
              {log.requesterNickname && <p>삭제 요청자: {log.requesterNickname}</p>}
              {log.changedFields.length > 0 && (
                <p>
                  변경 항목: {log.changedFields.map((field) => fields[field] || field).join(', ')}
                </p>
              )}
              {!log.hasSnapshot && (
                <p>상세 기록 기능이 추가되기 전의 작업입니다. 당시 내용은 복원할 수 없습니다.</p>
              )}
              {log.hasSnapshot && (
                <div className="post-history-comparison">
                  <Snapshot
                    title={log.action === 'post.update' ? '수정 전' : '삭제 당시'}
                    value={log.before}
                  />
                  {log.action === 'post.update' && <Snapshot title="수정 후" value={log.after} />}
                </div>
              )}
              {log.hasSnapshot && (
                <p className="field-hint">
                  첨부 이미지는 장수와 변경 여부를 기록하며, 본문은 텍스트로 표시합니다.
                </p>
              )}
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
