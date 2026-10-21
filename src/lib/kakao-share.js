// JavaScript keys are public browser keys; REST API credentials stay on the server.
export const kakaoJavaScriptKey = '3d1f509c6041af3403927f3ed4883fed';
let sdkPromise;
export function loadKakaoShare() {
  if (!sdkPromise)
    sdkPromise = new Promise((resolve, reject) => {
      const initialize = () => {
        try {
          if (!window.Kakao) throw Error('카카오 SDK를 불러오지 못했습니다.');
          if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoJavaScriptKey);
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
      description: '직장인 헬다이버즈 커뮤니티 · 로그인 후 게시글을 확인해주세요.',
      imageUrl,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: '게시글 보기', link: { mobileWebUrl: url, webUrl: url } }],
  };
}
