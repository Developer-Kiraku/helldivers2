import { postSummary } from './post-summary.mjs';
let sdkPromise, initializedKey;
export function isMobileShareDevice(client) {
  return Boolean(
    client.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(client.userAgent || '') ||
    (client.platform === 'MacIntel' && client.maxTouchPoints > 1),
  );
}
export function supportsKakaoWebShare(sdk, browser) {
  return typeof sdk?.Share?.sendDefault === 'function' && typeof browser.open === 'function';
}
export function loadKakaoShare(key) {
  if (!/^[a-f0-9]{32}$/i.test(key || ''))
    return Promise.reject(
      Error('공유용 JavaScript 키가 등록되지 않았습니다. 운영자에게 문의해주세요.'),
    );
  if (initializedKey !== key) {
    sdkPromise = undefined;
    initializedKey = key;
  }
  if (!sdkPromise)
    sdkPromise = new Promise((resolve, reject) => {
      const initialize = () => {
        try {
          if (!window.Kakao) throw Error('카카오 SDK를 불러오지 못했습니다.');
          if (
            window.Kakao.isInitialized() &&
            window.Kakao.getAppKey?.() !== key &&
            window.Kakao.cleanup
          )
            window.Kakao.cleanup();
          if (!window.Kakao.isInitialized()) window.Kakao.init(key);
          resolve(window.Kakao);
        } catch (error) {
          reject(error);
        }
      };
      if (window.Kakao) return initialize();
      const script = document.createElement('script');
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js';
      script.integrity = 'sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E';
      script.crossOrigin = 'anonymous';
      script.async = true;
      const timeout = setTimeout(() => {
        script.remove();
        reject(Error('카카오 연결 시간이 초과되었습니다.'));
      }, 15000);
      script.onload = () => {
        clearTimeout(timeout);
        initialize();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        script.remove();
        reject(Error('카카오 연결에 실패했습니다. 다시 시도해주세요.'));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      sdkPromise = undefined;
      throw error;
    });
  return sdkPromise;
}

export function shareMessage(post, url, imageUrl) {
  return {
    objectType: 'feed',
    content: {
      title: post.title.slice(0, 100),
      description: postSummary(post),
      imageUrl,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: '게시글 보기', link: { mobileWebUrl: url, webUrl: url } }],
  };
}

// The SDK submits its desktop form synchronously but does not return the popup handle.
export function sendKakaoShare(sdk, payload, browser) {
  const originalOpen = browser.open;
  let blocked = false;
  browser.open = function (...args) {
    const popup = originalOpen.apply(browser, args);
    if (!popup) blocked = true;
    return popup;
  };
  try {
    sdk.Share.sendDefault(payload);
  } finally {
    browser.open = originalOpen;
  }
  if (blocked)
    throw Error(
      '카카오 공유 창이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용한 뒤 다시 시도해주세요.',
    );
}
