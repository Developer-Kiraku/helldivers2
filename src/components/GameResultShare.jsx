'use client';
import { useEffect, useRef, useState } from 'react';
import { Share2, Download, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label } from './ui';
import Modal from './Modal';
import KakaoSymbol from './KakaoSymbol';
import {
  loadKakaoShare,
  sendKakaoShare,
  isMobileShareDevice,
  supportsKakaoWebShare,
} from '@/lib/kakao-share';
import { gameResultMessage } from '@/lib/game-results.mjs';

export default function GameResultShare({ game, resultId, label = '결과 공유' }) {
  const { api, notify } = useCommunity();
  const [selection, setSelection] = useState(null);
  const [share, setShare] = useState(null);
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [file, setFile] = useState(null);
  const [kakaoImage, setKakaoImage] = useState(null);
  const [error, setError] = useState('');
  const input = useRef(null);
  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    let active = true;
    const isMobile = isMobileShareDevice(navigator);
    setMobile(isMobile);
    setShare(null);
    setReady(false);
    setFile(null);
    setKakaoImage(null);
    setError('');
    const sdk = api('integrations/kakao')
      .then(({ javaScriptKey }) => loadKakaoShare(javaScriptKey))
      .catch((error) => ({ error }));
    (async () => {
      try {
        const { share: result } = await api('games/share', {
          method: 'POST',
          body: selection,
          signal: controller.signal,
        });
        if (!active) return;
        const url = new URL(result.path, location.origin).href;
        const imageUrl = `${url}/image`;
        setShare({ ...result, url, imageUrl });
        // Prepare the file before the click so native sharing retains the user gesture.
        void fetch(imageUrl, { signal: controller.signal })
          .then((response) => {
            if (!response.ok) throw Error('이미지를 불러오지 못했습니다.');
            return response.blob();
          })
          .then((blob) => {
            const file = new File([blob], 'helldivers-game-result.png', { type: 'image/png' });
            if (
              active &&
              typeof navigator.share === 'function' &&
              navigator.canShare?.({ files: [file] })
            )
              setFile(file);
          })
          .catch(() => {});
        const client = await sdk;
        if (!active) return;
        if (client.error) throw client.error;
        if (
          typeof client.Share?.sendDefault !== 'function' ||
          (!isMobile && !supportsKakaoWebShare(client, window))
        )
          throw Error('이 브라우저에서는 결과 링크를 복사해 공유해주세요.');
        let timer;
        try {
          const image = await Promise.race([
            client.Share.scrapImage({ imageUrl }),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(Error('이미지 준비 시간 초과')), 12000);
            }),
          ]);
          if (active) setKakaoImage(image.infos.original.url);
        } catch {
          if (active) setError('카카오 이미지 연결이 지연되어 결과 링크로 공유합니다.');
        } finally {
          clearTimeout(timer);
        }
        if (active) setReady(true);
      } catch (error) {
        if (active) setError(error.message || '결과를 준비하지 못했습니다. 다시 시도해주세요.');
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selection, api]);
  function send() {
    try {
      const payload = gameResultMessage(share.result, share.url, kakaoImage);
      if (mobile) window.Kakao.Share.sendDefault(payload);
      else sendKakaoShare(window.Kakao, payload, window);
    } catch (error) {
      setError(error.message || '카카오 공유 창을 열지 못했습니다. 링크 복사를 이용해주세요.');
    }
  }
  async function nativeShare() {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error.name !== 'AbortError')
        setError('이미지 공유를 열지 못했습니다. 이미지 저장 또는 카카오톡 공유를 이용해주세요.');
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(share.url);
      notify?.('게임 결과 주소를 복사했습니다.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setError('주소를 길게 누르거나 Ctrl+C로 복사해주세요.');
    }
  }
  return (
    <>
      {resultId && (
        <Button
          type="button"
          className="game-result-share-trigger"
          onClick={() => setSelection({ game, resultId })}
        >
          <Share2 size={16} />
          {label}
        </Button>
      )}
      {selection && (
        <Modal
          title={game === 'rps-hand' ? '내 손 강화 공유' : '게임 결과 공유'}
          className="game-result-share-modal"
          onClose={() => setSelection(null)}
        >
          {share ? (
            <>
              <img
                className="game-result-share-preview"
                src={share.imageUrl}
                width={1200}
                height={630}
                alt={`${share.result.gameLabel} · ${share.result.headline}`}
              />
              <p className="game-result-share-notice">
                {game === 'rps-hand'
                  ? '닉네임과 현재 손 강화 수치가 이미지로 공유됩니다.'
                  : '닉네임과 이 게임 결과만 공유됩니다.'}{' '}
                링크를 받은 사람은 로그인 없이 볼 수 있습니다.
              </p>
              <div className="post-share-options game-result-share-options">
                {(mobile || ready) && (
                  <Button
                    type="button"
                    className="kakao-share-button"
                    disabled={!ready}
                    onClick={send}
                  >
                    <KakaoSymbol size={20} />
                    {ready ? '카카오톡 공유' : '카카오톡 준비 중…'}
                  </Button>
                )}
                {file && (
                  <Button type="button" onClick={nativeShare}>
                    <ImageIcon size={18} />
                    이미지 공유
                  </Button>
                )}
                <a
                  className="game-result-download"
                  href={`${share.imageUrl}?download=1`}
                  download="helldivers-game-result.png"
                >
                  <Download size={18} />
                  이미지 저장
                </a>
                <Button type="button" onClick={copy}>
                  <LinkIcon size={18} />
                  링크 복사
                </Button>
              </div>
              <Label htmlFor={`game-share-${selection.resultId}`}>결과 주소</Label>
              <Input
                id={`game-share-${selection.resultId}`}
                ref={input}
                value={share.url}
                readOnly
                onFocus={(event) => event.target.select()}
              />
            </>
          ) : (
            !error && <p role="status">공유할 결과 이미지를 준비하고 있습니다…</p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!share && error && (
            <Button onClick={() => setSelection({ ...selection })}>다시 시도</Button>
          )}
        </Modal>
      )}
    </>
  );
}
