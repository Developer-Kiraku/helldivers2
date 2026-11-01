'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Mail,
  MailOpen,
  Send,
  Search,
  Plus,
  Reply,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import Modal from './Modal';
import { Button } from './ui';
import Nickname from './Nickname';

const dateLabel = (value) =>
  new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
function ComposeMessage({ initialRecipient, onClose, onSent }) {
  const { api, notify } = useCommunity();
  const [recipient, setRecipient] = useState(initialRecipient || null);
  const [query, setQuery] = useState(initialRecipient?.nickname || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  useEffect(() => {
    if (recipient || !query.trim()) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      return;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api(`messages/recipients?q=${encodeURIComponent(query.trim())}`);
        if (alive) {
          setResults(data.users);
          setSearched(true);
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setSearching(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, recipient, api]);
  async function send(event) {
    event.preventDefault();
    if (busy || !recipient || !body.trim()) return;
    setBusy(true);
    setError('');
    requestId.current ||= crypto.randomUUID();
    try {
      await api('messages', {
        method: 'POST',
        body: { recipientId: recipient.id, body, requestId: requestId.current },
      });
      notify('쪽지를 보냈습니다.');
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="쪽지 보내기"
      onClose={() => {
        if (!busy) onClose();
      }}
      className="message-compose-modal"
    >
      <form className="message-compose" onSubmit={send}>
        <label htmlFor="message-recipient">받는 사람</label>
        <div className={`message-recipient-search${recipient ? ' is-chosen' : ''}`}>
          <Search size={17} aria-hidden="true" />
          <input
            id="message-recipient"
            autoComplete="off"
            placeholder="회원 닉네임 검색"
            value={query}
            maxLength={30}
            disabled={busy}
            onChange={(event) => {
              setQuery(event.target.value);
              setRecipient(null);
              requestId.current = null;
              setError('');
            }}
          />
          {recipient && <span>선택됨</span>}
        </div>
        {searching && (
          <p className="message-hint" role="status">
            회원 검색 중…
          </p>
        )}
        {!recipient && results.length > 0 && (
          <ul className="message-recipient-results" aria-label="회원 검색 결과">
            {results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    setRecipient(person);
                    setQuery(person.nickname);
                    requestId.current = null;
                  }}
                >
                  <Nickname name={person.nickname} role={person.role} />
                  <span>선택</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!recipient && searched && !searching && !results.length && (
          <p className="message-hint">일치하는 회원이 없습니다.</p>
        )}
        <label htmlFor="message-body">내용</label>
        <textarea
          id="message-body"
          rows={9}
          placeholder="전하고 싶은 이야기를 적어주세요."
          value={body}
          disabled={busy}
          onChange={(event) => {
            if (Array.from(event.target.value).length <= 2000) {
              setBody(event.target.value);
              requestId.current = null;
            }
          }}
        />
        <div className="message-compose-bottom">
          <span>{Array.from(body).length.toLocaleString('ko-KR')} / 2,000</span>
          <Button
            className="primary-button"
            type="submit"
            disabled={busy || !recipient || !body.trim()}
          >
            <Send size={16} />
            {busy ? '보내는 중…' : '쪽지 보내기'}
          </Button>
        </div>
        {error && (
          <p className="message-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export default function MessagesPage() {
  const { api, user, role, actualRole, notify, setUnreadMessages } = useCommunity();
  const [box, setBox] = useState('inbox');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compose, setCompose] = useState(null);
  const [detail, setDetail] = useState(null);
  const [opening, setOpening] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = role !== actualRole;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api(`messages?box=${box}&page=${page}&unread=${box === 'inbox' && unreadOnly}`)
      .then((result) => {
        if (alive) {
          setData(result);
          setUnreadMessages(result.unreadCount);
        }
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, box, page, unreadOnly, version, setUnreadMessages]);
  function reload() {
    setVersion((value) => value + 1);
  }
  async function openMessage(message) {
    if (opening) return;
    setOpening(message.id);
    setError('');
    try {
      const markRead = message.recipient.id === user.id && !preview;
      const result = await api(
        `messages/${message.id}${markRead ? '/read' : ''}`,
        markRead ? { method: 'POST', body: {} } : {},
      );
      setDetail(result.message);
      setConfirmDelete(false);
      if (markRead) {
        setUnreadMessages(result.unreadCount);
        reload();
      }
    } catch (err) {
      notify(err.message);
    } finally {
      setOpening(null);
    }
  }
  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      const result = await api(`messages/${detail.id}`, { method: 'DELETE', body: {} });
      setUnreadMessages(result.unreadCount);
      setDetail(null);
      reload();
      notify('내 쪽지함에서 삭제했습니다.');
    } catch (err) {
      notify(err.message);
    } finally {
      setDeleting(false);
    }
  }
  const other = detail && (detail.sender.id === user?.id ? detail.recipient : detail.sender);
  return (
    <div className="messages-page">
      <header className="messages-heading">
        <div>
          <span className="warbond-eyebrow">PRIVATE MESSAGES</span>
          <h1>쪽지함</h1>
        </div>
        <Button
          className="primary-button"
          onClick={() => setCompose({})}
          disabled={preview || Boolean(user?.mutedUntil)}
        >
          <Plus size={18} />
          쪽지 보내기
        </Button>
      </header>
      <div className="messages-toolbar">
        <div className="messages-tabs" aria-label="쪽지함 선택">
          <button
            type="button"
            aria-pressed={box === 'inbox'}
            onClick={() => {
              setBox('inbox');
              setPage(1);
            }}
          >
            <Mail size={17} />
            받은 쪽지
            {Boolean(data?.unreadCount) && (
              <span className="message-nav-count">{data.unreadCount}</span>
            )}
          </button>
          <button
            type="button"
            aria-pressed={box === 'sent'}
            onClick={() => {
              setBox('sent');
              setPage(1);
            }}
          >
            <Send size={17} />
            보낸 쪽지
          </button>
        </div>
        <div className="messages-filter">
          {box === 'inbox' && (
            <label>
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => {
                  setUnreadOnly(event.target.checked);
                  setPage(1);
                }}
              />
              안 읽은 쪽지만
            </label>
          )}
          <button type="button" aria-label="쪽지 새로고침" disabled={loading} onClick={reload}>
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
      {error && (
        <p className="message-error" role="alert">
          {error}
          <button type="button" onClick={reload}>
            다시 시도
          </button>
        </p>
      )}
      {loading ? (
        <div className="messages-empty" role="status">
          쪽지를 불러오는 중…
        </div>
      ) : (
        !error && (
          <>
            <div className="message-list">
              {data?.messages.map((message) => {
                const person = box === 'inbox' ? message.sender : message.recipient;
                return (
                  <button
                    type="button"
                    className={`message-row${!message.readAt && box === 'inbox' ? ' is-unread' : ''}`}
                    key={message.id}
                    disabled={Boolean(opening)}
                    onClick={() => openMessage(message)}
                  >
                    <span className="message-row-icon">
                      {message.readAt ? <MailOpen size={21} /> : <Mail size={21} />}
                    </span>
                    <span className="message-row-content">
                      <span className="message-row-top">
                        <Nickname name={person.nickname} role={person.role} />
                        <time dateTime={message.createdAt}>{dateLabel(message.createdAt)}</time>
                      </span>
                      <span className="message-preview">{message.preview}</span>
                    </span>
                    <span className={`message-read-status${message.readAt ? ' is-read' : ''}`}>
                      {opening === message.id ? '여는 중…' : message.readAt ? '읽음' : '안 읽음'}
                    </span>
                  </button>
                );
              })}
            </div>
            {!data?.messages.length && (
              <div className="messages-empty">
                <MailOpen size={34} />
                <h2>
                  {box === 'sent'
                    ? '보낸 쪽지가 없습니다.'
                    : unreadOnly
                      ? '안 읽은 쪽지가 없습니다.'
                      : '아직 받은 쪽지가 없습니다.'}
                </h2>
                <p>회원에게 쪽지를 보내 이야기를 나눠보세요.</p>
              </div>
            )}
            {data && data.pageCount > 1 && (
              <nav className="message-pagination" aria-label="쪽지 목록 페이지">
                <button
                  type="button"
                  disabled={data.page === 1}
                  aria-label="이전 페이지"
                  onClick={() => setPage(data.page - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {data.page} / {data.pageCount}
                </span>
                <button
                  type="button"
                  disabled={data.page === data.pageCount}
                  aria-label="다음 페이지"
                  onClick={() => setPage(data.page + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            )}
          </>
        )
      )}
      {compose && (
        <ComposeMessage
          initialRecipient={compose.recipient}
          onClose={() => setCompose(null)}
          onSent={() => {
            setCompose(null);
            setBox('sent');
            setPage(1);
            reload();
          }}
        />
      )}
      {detail && (
        <Modal
          title="쪽지"
          className="message-detail-modal"
          onClose={() => {
            if (!deleting) setDetail(null);
          }}
        >
          <div className="message-detail-meta">
            <div>
              <span>보낸 사람</span>
              <Nickname name={detail.sender.nickname} role={detail.sender.role} />
            </div>
            <div>
              <span>받는 사람</span>
              <Nickname name={detail.recipient.nickname} role={detail.recipient.role} />
            </div>
            <div>
              <span>보낸 시간</span>
              <time dateTime={detail.createdAt}>
                {new Date(detail.createdAt).toLocaleString('ko-KR')}
              </time>
            </div>
            <div>
              <span>읽음 상태</span>
              <span>
                {detail.readAt ? new Date(detail.readAt).toLocaleString('ko-KR') : '아직 읽지 않음'}
              </span>
            </div>
          </div>
          <p className="message-detail-body">{detail.body}</p>
          <div className="message-detail-actions">
            <Button
              type="button"
              disabled={deleting || preview}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
              삭제
            </Button>
            <Button
              type="button"
              className="primary-button"
              disabled={!other?.active || preview || Boolean(user?.mutedUntil)}
              onClick={() => {
                setDetail(null);
                setCompose({ recipient: other });
              }}
            >
              <Reply size={16} />
              {detail.sender.id === user?.id ? '다시 보내기' : '답장'}
            </Button>
          </div>
          {confirmDelete && (
            <div className="message-delete-confirm" role="alert">
              <p>내 쪽지함에서 삭제할까요? 상대방의 쪽지는 유지됩니다.</p>
              <div>
                <Button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                  취소
                </Button>
                <Button type="button" disabled={deleting} onClick={remove}>
                  {deleting ? '삭제 중…' : '삭제하기'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
