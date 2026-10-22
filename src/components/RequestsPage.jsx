'use client';
import Nickname from './Nickname';
import { ActionLink, Button, Label, Select, TextArea } from './ui';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import Icon from './Icon';
import PageSkeleton from './PageSkeleton';
import Modal from './Modal';
const statuses = { pending: '대기', approved: '승인', rejected: '거부' };
const types = {
  member_approval: '견습회원 가입 승인',
  post_delete: '게시글 삭제',
  user_expel: '회원 강퇴',
};
const date = (value) =>
  value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-';
export default function RequestsPage() {
  const { api, refresh, notify } = useCommunity();
  const [requests, setRequests] = useState([]),
    [filter, setFilter] = useState('pending'),
    [type, setType] = useState('all'),
    [error, setError] = useState(''),
    [review, setReview] = useState(null),
    [note, setNote] = useState(''),
    [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const data = await api('admin/approvals');
      setRequests(data.requests);
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (review.item.type === 'member_approval')
        await api(`admin/users/${review.item.targetId}/approve`, { method: 'POST', body: {} });
      else
        await api(`admin/requests/${review.item.id}/review`, {
          method: 'POST',
          body: { decision: review.decision, note },
        });
      setReview(null);
      await load();
      await refresh();
      notify(
        review.item.type === 'member_approval'
          ? '견습회원을 승인하고 일반회원으로 전환했습니다.'
          : review.decision === 'approved'
            ? '승인하고 요청한 작업을 적용했습니다.'
            : '요청을 거부했습니다.',
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function openReview(item, decision) {
    setReview({ item, decision });
    setNote('');
    setError('');
  }
  const byType = requests.filter((item) => type === 'all' || item.type === type);
  const filtered = byType.filter((item) => filter === 'all' || item.status === filter);
  const availableTypes = Object.entries(types).filter(([value]) =>
    requests.some((item) => item.type === value),
  );
  if (loading) return <PageSkeleton path="/admin/approvals" />;
  return (
    <section className="admin-page">
      <header className="page-heading">
        <div>
          <div className="eyebrow">APPROVAL CENTER</div>
          <h1>요청 승인 목록</h1>
          <p>내 권한으로 처리할 수 있는 가입·게시글·회원 관련 요청과 처리 이력을 확인합니다.</p>
        </div>
      </header>
      <div className="board-toolbar approval-toolbar">
        <span>요청 {requests.length}건</span>
        <Label className="request-type-filter">
          <span>요청 종류</span>
          <Select
            aria-label="요청 종류"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">전체</option>
            {availableTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      <div className="category-tabs">
        {[
          ['pending', '대기'],
          ['approved', '승인'],
          ['rejected', '거부'],
          ['all', '전체'],
        ].map(([value, label]) => (
          <Button
            key={value}
            className={filter === value ? 'selected' : ''}
            onClick={() => setFilter(value)}
          >
            {label} {byType.filter((item) => value === 'all' || item.status === value).length}
          </Button>
        ))}
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <div className="request-list">
        {filtered.map((item) => (
          <article className="panel request-card" key={item.id}>
            <header>
              <span className="badge">{types[item.type] || item.type}</span>
              <span className={`status-label ${item.status}`}>{statuses[item.status]}</span>
              <time>{date(item.createdAt)}</time>
            </header>
            <h2>
              {item.type === 'post_delete' ? (
                item.targetSnapshot
              ) : (
                <Nickname name={item.targetSnapshot} role={item.targetRole} />
              )}
            </h2>
            <p className="request-reason">{item.reason}</p>
            <dl className="member-info">
              <dt>요청자</dt>
              <dd>
                <Nickname name={item.requesterNickname} role={item.requesterRole} />
              </dd>
              {item.expiresAt && (
                <>
                  <dt>승인 기한</dt>
                  <dd>
                    {date(item.expiresAt)}
                    <br />
                    기한 내 미승인 시 자동 탈퇴됩니다.
                  </dd>
                </>
              )}
              <dt>처리자</dt>
              <dd>
                {item.reviewerNickname ? (
                  <Nickname name={item.reviewerNickname} role={item.reviewerRole} />
                ) : (
                  '-'
                )}
              </dd>
              <dt>처리일</dt>
              <dd>{date(item.reviewedAt)}</dd>
              {item.reviewNote && (
                <>
                  <dt>처리 의견</dt>
                  <dd>{item.reviewNote}</dd>
                </>
              )}
            </dl>
            <footer>
              {item.board && (
                <ActionLink
                  className="button secondary"
                  href={`/boards/${item.board}/${item.targetId}`}
                >
                  대상 게시글
                </ActionLink>
              )}
              {item.type === 'member_approval' && (
                <ActionLink className="button secondary" href="/admin/users">
                  <Icon name="user" size={17} />
                  회원 정보 확인
                </ActionLink>
              )}
              {item.status === 'pending' && (
                <>
                  {item.canReject && (
                    <Button
                      className="button secondary"
                      onClick={() => openReview(item, 'rejected')}
                    >
                      <Icon name="close" size={17} />
                      거부
                    </Button>
                  )}
                  {item.canApprove && (
                    <Button className="button primary" onClick={() => openReview(item, 'approved')}>
                      <Icon name="check" size={17} />
                      승인
                    </Button>
                  )}
                </>
              )}
            </footer>
          </article>
        ))}
      </div>
      {!filtered.length && <div className="empty-state">해당 요청이 없습니다.</div>}
      {review && (
        <Modal
          title={review.decision === 'approved' ? '요청 승인' : '요청 거부'}
          onClose={() => setReview(null)}
        >
          <form onSubmit={submit}>
            <p>
              {types[review.item.type]} ·{' '}
              {review.item.type === 'post_delete' ? (
                review.item.targetSnapshot
              ) : (
                <Nickname name={review.item.targetSnapshot} role={review.item.targetRole} />
              )}
            </p>
            <p>
              {review.item.type === 'member_approval'
                ? '승인하면 일반회원으로 전환되고 미승인에 따른 자동 탈퇴 대상에서 제외됩니다.'
                : review.decision === 'approved'
                  ? '승인하면 요청한 삭제 또는 강퇴를 즉시 실행합니다.'
                  : '거부하면 대상 게시글과 회원 상태는 변경되지 않습니다.'}
            </p>
            {review.item.type !== 'member_approval' && (
              <>
                <Label htmlFor="review-note">처리 의견 (선택)</Label>
                <TextArea
                  id="review-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
              </>
            )}
            <p className="form-error" role="alert">
              {error}
            </p>
            <div className="form-actions">
              <Button type="button" className="button secondary" onClick={() => setReview(null)}>
                취소
              </Button>
              <Button className="button primary" disabled={busy}>
                {busy ? '처리 중…' : review.decision === 'approved' ? '승인하기' : '거부하기'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
