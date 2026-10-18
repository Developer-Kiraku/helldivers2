'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import KakaoSymbol from './KakaoSymbol';
import { useCommunity } from './CommunityProvider';
import { loadKakaoShare, shareMessage } from '@/lib/kakao-share';
import { site } from '@/lib/site.mjs';

export default function PostShare({ post }) {
  const { notify } = useCommunity();
  const [open, setOpen] = useState(false), [url, setUrl] = useState('');
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    // Pages is a hash-router preview; its links must retain the repository path.
    const preview = location.hostname.endsWith('github.io');
    setUrl(preview ? `${location.origin}${location.pathname}#/boards/${post.board}/${post.id}` : new URL(post.sharePath || `/boards/${post.board}/${post.id}`, location.origin).href);
    setError(''); setReady(false);
    loadKakaoShare().then(() => { if (alive) setReady(true); }).catch(error => { if (alive) setError(error.message); });
    return () => { alive = false; };
  }, [open, post.id, post.board, post.sharePath]);
  function kakaoShare() {
    try {
      const imageUrl = new URL(site.image, location.hostname.endsWith('github.io') ? `${location.origin}${location.pathname}` : `${location.origin}/`).href;
      window.Kakao.Share.sendDefault(shareMessage(post, url, imageUrl));
    } catch { setError('카카오 공유를 열지 못했습니다. 팝업 허용 및 카카오 앱의 웹 도메인 설정을 확인해주세요.'); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); notify('게시글 주소를 복사했습니다.'); }
    catch { input.current?.focus(); input.current?.select(); setError('아래 주소를 길게 누르거나 Ctrl+C로 복사해주세요.'); }
  }
  return <><Button type="button" className="post-share-trigger" onClick={() => setOpen(true)} aria-label="카카오톡 및 URL 공유"><Icon name="share" size={16} />공유</Button>{open && <Modal title="게시글 공유" onClose={() => setOpen(false)}>
    <p className="share-post-title">{post.title}</p>
    <p className="field-hint">공유받은 게시글은 로그인 후 확인할 수 있어요.</p>
    <div className="post-share-options"><Button type="button" className="kakao-share-button" disabled={!ready || !url} onClick={kakaoShare}><KakaoSymbol size={20} />{ready ? '카카오톡 공유' : '카카오 연결 중…'}</Button><Button type="button" disabled={!url} onClick={copy}><Icon name="link" size={18} />URL 복사하기</Button></div>
    <Label htmlFor={`share-url-${post.id}`}>{post.sharePath ? '짧은 게시글 주소' : '게시글 주소'}</Label><Input id={`share-url-${post.id}`} ref={input} className="share-url-input" value={url} readOnly onFocus={event => event.target.select()} />
    {error && <div className="share-error"><p className="form-error" role="alert">{error}</p>{!ready && <Button type="button" onClick={() => { setOpen(false); }}>닫고 다시 시도</Button>}</div>}
  </Modal>}</>;
}
