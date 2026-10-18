# 카카오톡 공유

모든 게시판의 게시글 상세 및 헬다이버톡·질문상담실 피드의 **공유** 버튼에서 카카오톡 공유와 URL 복사를 제공합니다.
Render에서는 `/s/16자리코드` 주소를 사용합니다. 코드가 동일 게시글에 대해 유지되며, 게시글을 삭제하면 링크도 404가 됩니다. 로그인 전에는 로그인 화면으로 이동하며 로그인 후 원래 게시글을 엽니다. 외부 단축 URL 서비스를 사용하지 않습니다.

공개 JavaScript 키는 `src/lib/kakao-share.js`에서 설정합니다. 이 키는 브라우저 공유용이며 카카오 로그인용 `KAKAO_REST_API_KEY`와 다릅니다.

## 카카오 Developers 필수 설정

해당 앱에서 아래 두 곳에 `https://helldivers2.onrender.com`을 등록하세요.

1. 앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인
2. 앱 → 제품 링크 → 웹 도메인

로컬 테스트에는 `http://localhost:3000`, GitHub Pages 미리보기에는 `https://developer-kiraku.github.io`도 각각 등록해야 합니다. Pages는 정적 미리보기이므로 `/s/` 서버 경로 대신 해시 라우터 주소를 공유합니다.

SDK는 공유 창을 열 때만 로드합니다. 카카오 연결이 실패해도 URL 복사는 사용할 수 있습니다. 공유 메시지는 게시글 제목, 공용 대시보드 이미지, 링크만 포함하며 본문과 회원 정보는 보내지 않습니다.

참고: https://developers.kakao.com/docs/ko/kakaotalk-share/js-link
