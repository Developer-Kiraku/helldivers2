'use client';
import { useEffect, useState } from 'react';
import { Coins, Users, UserRound, History } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label } from './ui';
import Modal from './Modal';

const apiPath = 'admin/settings/point-grants';
const format = (number) => number.toLocaleString('ko-KR');
export default function PointGrants() {
  const { api, notify, refresh } = useCommunity();
  const [data, setData] = useState(null),
    [scope, setScope] = useState('selected'),
    [ids, setIds] = useState([]),
    [query, setQuery] = useState(''),
    [amount, setAmount] = useState('1000'),
    [reason, setReason] = useState(''),
    [operation, setOperation] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  useEffect(() => {
    let active = true;
    api(apiPath)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [api]);
  const filtered = (data?.users || []).filter((user) =>
    user.nickname.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const count = scope === 'all' ? data?.users.length || 0 : ids.length;
  const value = Number(amount);
  async function review(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (!Number.isInteger(value) || value < 1 || value > 1000000)
        throw Error('1~1,000,000P 사이의 정수 금액을 입력해주세요.');
      const current = await api(apiPath);
      setData(current);
      const recipients = current.users.filter((user) => scope === 'all' || ids.includes(user.id));
      if (!recipients.length) throw Error('지급할 회원을 선택해주세요.');
      if (scope === 'selected' && recipients.length !== ids.length) {
        setIds(recipients.map((user) => user.id));
        throw Error('회원 목록이 변경됐습니다. 지급 대상을 다시 확인해주세요.');
      }
      setOperation({
        requestId: crypto.randomUUID(),
        scope,
        userIds: scope === 'all' ? [] : recipients.map((user) => user.id),
        amount: value,
        reason: reason.trim(),
        expectedCount: recipients.length,
        audienceVersion: scope === 'all' ? current.audienceVersion : null,
        recipients,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (busy || !operation) return;
    setBusy(true);
    setError('');
    try {
      const { recipients, ...payload } = operation;
      const result = await api(apiPath, { method: 'POST', body: payload });
      const message =
        result.grant.count + '명에게 각각 ' + format(result.grant.amount) + 'P를 지급했습니다.';
      setOperation(null);
      setIds([]);
      setReason('');
      setSuccess(message);
      notify(message);
      await refresh();
      setData(await api(apiPath));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel api-key-panel point-grants" id="point-grants">
      <header>
        <h2>
          <Coins size={20} />
          포인트 지급
        </h2>
        <span className="eyebrow">POINT GRANT</span>
      </header>
      <p>
        회원별 또는 전체 회원에게 동일한 금액을 지급합니다. 누적 포인트와 현재 포인트에 모두
        반영됩니다.
      </p>
      {error && !operation && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="point-grant-summary">
          {success}
        </p>
      )}
      {!data && !error && <p role="status">지급 대상과 이력을 불러오는 중…</p>}
      {data && (
        <form onSubmit={review} className="point-grant-form">
          <div className="point-grant-modes" role="group" aria-label="포인트 지급 대상">
            <Button
              type="button"
              aria-pressed={scope === 'selected'}
              disabled={busy}
              onClick={() => setScope('selected')}
            >
              <UserRound size={16} />
              회원 선택
            </Button>
            <Button
              type="button"
              aria-pressed={scope === 'all'}
              disabled={busy}
              onClick={() => setScope('all')}
            >
              <Users size={16} />
              전체 회원 {data.users.length}명
            </Button>
          </div>
          {scope === 'selected' ? (
            <div className="point-grant-picker">
              <Label htmlFor="grant-member-search">회원 검색</Label>
              <Input
                id="grant-member-search"
                placeholder="닉네임으로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={busy}
              />
              <div className="point-grant-member-list">
                {filtered.map((user) => (
                  <label
                    className={'point-grant-member' + (ids.includes(user.id) ? ' is-selected' : '')}
                    key={user.id}
                  >
                    <Input
                      type="checkbox"
                      checked={ids.includes(user.id)}
                      disabled={busy}
                      onChange={(event) =>
                        setIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, user.id])]
                            : current.filter((id) => id !== user.id),
                        )
                      }
                    />
                    <span>{user.nickname}</span>
                    <small>현재 {format(user.current)} P</small>
                  </label>
                ))}
                {!filtered.length && <p>조건에 맞는 회원이 없습니다.</p>}
              </div>
              <div className="point-grant-picker-footer">
                <span>{ids.length}명 선택</span>
                <Button type="button" disabled={busy || !ids.length} onClick={() => setIds([])}>
                  선택 해제
                </Button>
              </div>
            </div>
          ) : (
            <p className="point-grant-summary">
              전체 활동 회원 {data.users.length}명이 대상입니다.
              <span>총관리자와 테스트 유저를 포함하며, 탈퇴한 회원은 제외됩니다.</span>
            </p>
          )}
          <div className="point-grant-fields">
            <Label>
              1인당 지급 포인트
              <Input
                type="number"
                min={1}
                max={1000000}
                step={1}
                required
                value={amount}
                disabled={busy}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Label>
            <Label>
              지급 사유 (선택)
              <Input
                maxLength={200}
                value={reason}
                disabled={busy}
                placeholder="예: 이벤트 보상, 테스트 포인트"
                onChange={(event) => setReason(event.target.value)}
              />
            </Label>
          </div>
          <div className="api-key-actions point-grant-submit">
            <span>
              {count}명 × {Number.isInteger(value) && value > 0 ? format(value) : '0'}P
            </span>
            <Button
              type="submit"
              disabled={busy || !count || !Number.isInteger(value) || value < 1 || value > 1000000}
            >
              {busy ? '확인 중…' : '지급 내용 확인'}
            </Button>
          </div>
        </form>
      )}
      {data && (
        <div className="point-grant-history">
          <h3>
            <History size={16} />
            최근 지급 이력
          </h3>
          {!data.history.length && <p>아직 수동 지급 이력이 없습니다.</p>}
          <div>
            {data.history.map((grant) => (
              <details key={grant.id}>
                <summary>
                  <strong>
                    +{format(grant.amount)} P <small>× {grant.count}명</small>
                  </strong>
                  <span>{grant.scope === 'all' ? '전체 회원' : '선택 회원'}</span>
                  <time>
                    {new Date(grant.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </time>
                </summary>
                <div>
                  <p>
                    지급자: {grant.actorNickname} · 총 {format(grant.total)}P
                  </p>
                  <p>{grant.recipients.map((user) => user.nickname).join(', ')}</p>
                  {grant.reason && <p>사유: {grant.reason}</p>}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
      {operation && (
        <Modal
          title="포인트 지급 확인"
          onClose={() => {
            if (!busy) {
              setOperation(null);
              setError('');
            }
          }}
          className="point-grant-modal"
          footer={
            <>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOperation(null);
                  setError('');
                }}
              >
                취소
              </Button>
              <Button type="button" disabled={busy} onClick={pay}>
                {busy ? '지급 중…' : '지급 확정'}
              </Button>
            </>
          }
        >
          <dl className="point-grant-confirm">
            <div>
              <dt>지급 대상</dt>
              <dd>
                {operation.scope === 'all' ? '전체 회원' : '선택 회원'} {operation.expectedCount}명
              </dd>
            </div>
            <div>
              <dt>1인당 지급액</dt>
              <dd>{format(operation.amount)} P</dd>
            </div>
            <div>
              <dt>총 지급액</dt>
              <dd>{format(operation.amount * operation.expectedCount)} P</dd>
            </div>
          </dl>
          <p className="point-grant-confirm-members">
            {operation.recipients.map((user) => user.nickname).join(', ')}
          </p>
          {operation.reason && <p>사유: {operation.reason}</p>}
          <p>확정하면 대상 회원의 누적·현재 포인트에 각각 반영됩니다.</p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
