'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Label } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import KakaoSymbol from './KakaoSymbol';
import { useCommunity } from './CommunityProvider';
import {
  loadKakaoShare,
  sendKakaoShare,
  shareMessage,
  isMobileShareDevice,
  supportsKakaoWebShare,
} from '@/lib/kakao-share';
import { site } from '@/lib/site.mjs';
import { Send } from 'lucide-react';
import { postSummary } from '@/lib/post-summary.mjs';

export default function PostShare({ post, iconOnly = false }) {
  const { notify, api } = useCommunity();
  const [open, setOpen] = useState(false),
    [url, setUrl] = useState('');
  const [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [mobile, setMobile] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const mobileDevice = isMobileShareDevice(navigator);
    setMobile(mobileDevice);
    // Pages is a hash-router preview; its links must retain the repository path.
    const preview = location.hostname.endsWith('github.io');
    setUrl(
      preview
        ? `${location.origin}${location.pathname}#/boards/${post.board}/${post.id}`
        : new URL(post.sharePath || `/boards/${post.board}/${post.id}`, location.origin).href,
    );
    setError('');
    setReady(false);
    api('integrations/kakao')
      .then(({ javaScriptKey }) => loadKakaoShare(javaScriptKey))
      .then((sdk) => {
        if (
          typeof sdk?.Share?.sendDefault !== 'function' ||
          (!mobileDevice && !supportsKakaoWebShare(sdk, window))
        )
          throw Error('이 브라우저에서는 카카오톡 공유를 사용할 수 없습니다. URL을 복사해주세요.');
        if (alive) setReady(true);
      })
      .catch((error) => {
        if (alive) setError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [open, post.id, post.board, post.sharePath, api]);
  function kakaoShare() {
    try {
      const imageUrl = new URL(
        site.image,
        location.hostname.endsWith('github.io')
          ? `${location.origin}${location.pathname}`
          : `${location.origin}/`,
      ).href;
      const payload = shareMessage(post, url, imageUrl);
      if (mobile) window.Kakao.Share.sendDefault(payload);
      else sendKakaoShare(window.Kakao, payload, window);
    } catch (error) {
      setError(
        error.message ||
          '카카오 공유를 열지 못했습니다. 팝업 허용 및 카카오 앱의 웹 도메인 설정을 확인해주세요.',
      );
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      notify('게시글 주소를 복사했습니다.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setError('아래 주소를 길게 누르거나 Ctrl+C로 복사해주세요.');
    }
  }
  return (
    <>
      <Button
        type="button"
        className={`post-share-trigger ${iconOnly ? 'helsta-icon-button' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="카카오톡 및 URL 공유"
      >
        {iconOnly ? (
          <Send size={25} />
        ) : (
          <>
            <Icon name="share" size={16} />
            공유
          </>
        )}
      </Button>
      {open && (
        <Modal title="게시글 공유" onClose={() => setOpen(false)}>
          <p className="share-post-title">{post.title}</p>
          <p className="share-post-summary">{postSummary(post)}</p>
          <div className={`post-share-options ${!mobile && !ready ? 'single-option' : ''}`}>
            {(mobile || ready) && (
              <Button
                type="button"
                className="kakao-share-button"
                disabled={!ready || !url}
                onClick={kakaoShare}
                aria-busy={!ready}
              >
                <KakaoSymbol size={20} />
                카카오톡 공유
              </Button>
            )}
            <Button type="button" disabled={!url} onClick={copy}>
              <Icon name="link" size={18} />
              URL 복사하기
            </Button>
          </div>
          <Label htmlFor={`share-url-${post.id}`}>
            {post.sharePath ? '짧은 게시글 주소' : '게시글 주소'}
          </Label>
          <Input
            id={`share-url-${post.id}`}
            ref={input}
            className="share-url-input"
            value={url}
            readOnly
            onFocus={(event) => event.target.select()}
          />
          {error && (
            <div className="share-error">
              <p className="form-error" role="alert">
                {error}
              </p>
              {!ready && (
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  닫고 다시 시도
                </Button>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
