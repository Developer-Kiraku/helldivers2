'use client';
import { Fragment, useEffect, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Select } from './ui';
import { auditLogTypes } from '@/lib/audit-log-types.mjs';
import { isStaff } from '@/lib/roles';
import { muteDurations } from '@/lib/member-mute.mjs';

const date = (value, withTime = false) =>
  value
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(withTime
          ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }
          : {}),
      }).format(new Date(value))
    : '정보 없음';

export default function AuditLogPage() {
  const { api, role } = useCommunity();
  const [type, setType] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState('');
  const [page, setPage] = useState(1),
    [data, setData] = useState(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    if (!isStaff(role)) return;
    let alive = true;
    setLoading(true);
    setExpanded({});
    setError('');
    const parameters = new URLSearchParams({
      type: type === 'all' ? '' : type,
      q: query,
      page: String(page),
    });
    api(`admin/logs?${parameters}`)
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
  }, [api, role, type, query, page]);
  if (!isStaff(role))
    return (
      <section className="access-panel">
        <h1>운영진 전용입니다.</h1>
      </section>
    );
  const members = type.startsWith('member_');
  const posts = type.startsWith('post_');
  return (
    <section className="admin-page audit-log-page">
      <header className="audit-log-header">
        <h1>로그 확인</h1>
        <span>한국 시간 · 최근순</span>
      </header>
      <form
        className="audit-log-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(draft.trim());
        }}
      >
        <Select
          aria-label="로그 분류"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">전체 분류</option>
          {Object.entries(auditLogTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="제목 또는 닉네임 검색"
          placeholder="제목 또는 닉네임"
          value={draft}
          maxLength={100}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit">검색</Button>
        <span role="status">{loading ? '불러오는 중…' : `${data?.total || 0}건`}</span>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="audit-log-table-wrap" tabIndex={0} role="region" aria-label="로그 목록">
        <table className="audit-log-table" aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">분류</th>
              <th scope="col">실행 일시</th>
              <th scope="col">실행한 유저</th>
              <th scope="col">
                {members ? '회원 닉네임' : posts ? '글 제목' : '글 제목 / 회원 닉네임'}
              </th>
              <th scope="col">{members ? '가입일' : posts ? '작성일' : '작성일 / 가입일'}</th>
            </tr>
          </thead>
          <tbody>
            {loading || error ? (
              <tr>
                <td colSpan={5}>
                  {loading ? '로그를 불러오는 중입니다.' : '로그를 불러오지 못했습니다.'}
                </td>
              </tr>
            ) : !data?.logs.length ? (
              <tr>
                <td colSpan={5}>조건에 맞는 로그가 없습니다.</td>
              </tr>
            ) : (
              data.logs.map((entry) => (
                <Fragment key={entry.id}>
                  <tr>
                    <td>
                      {auditLogTypes[entry.type]}
                      {entry.type === 'member_mute' && (
                        <small title={`종료: ${date(entry.mutedUntil, true)}`}>
                          {' '}
                          · {muteDurations[entry.muteDuration]}
                        </small>
                      )}
                      {entry.automatic ? ' (자동)' : ''}
                      {entry.reason && (
                        <Button
                          type="button"
                          className="audit-log-reason-toggle"
                          aria-label={`${entry.targetName} 사유 ${expanded[entry.id] ? '접기' : '보기'}`}
                          aria-expanded={Boolean(expanded[entry.id])}
                          aria-controls={`log-reason-${entry.id}`}
                          onClick={() =>
                            setExpanded((value) => ({ ...value, [entry.id]: !value[entry.id] }))
                          }
                        >
                          사유 {expanded[entry.id] ? '▴' : '▾'}
                        </Button>
                      )}
                    </td>
                    <td>
                      <time dateTime={entry.executedAt}>{date(entry.executedAt, true)}</time>
                    </td>
                    <td>{entry.actorNickname}</td>
                    <td className="audit-log-target" title={entry.targetName}>
                      {entry.targetName}
                    </td>
                    <td>
                      {entry.targetCreatedAt ? (
                        <time dateTime={entry.targetCreatedAt}>{date(entry.targetCreatedAt)}</time>
                      ) : (
                        '정보 없음'
                      )}
                    </td>
                  </tr>
                  {entry.reason && expanded[entry.id] && (
                    <tr className="audit-log-reason-row" id={`log-reason-${entry.id}`}>
                      <td colSpan={5}>
                        <strong>사유</strong>
                        <p>{entry.reason}</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.pageCount > 1 && (
        <nav className="audit-log-pagination" aria-label="로그 페이지">
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
    </section>
  );
}
