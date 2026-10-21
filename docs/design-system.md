# 스타일·개발 소스 수정 가이드

## 한곳에서 디자인 값 바꾸기

**`src/styles/_tokens.scss`가 디자인 값의 원본입니다.** 색상, 글꼴, 글자 크기, 간격, 크기, 모서리, 전환 시간, 굵기, 행간, 레이어, 투명도, 반응형 기준을 그룹별 Sass 맵으로 모았습니다. 전역 SCSS가 이를 CSS 변수로 한 번 출력하므로 컴포넌트마다 다시 정의하지 않습니다. CSS 변수에는 전용 `--hd-` 접두사를 붙여 Radix의 `--space-*`, `--radius-*` 등과 충돌하지 않게 했습니다.

| 바꿀 항목 | 토큰 예시 | 현재 값 |
| --- | --- | --- |
| 페이지 배경 | `color.background` → `--hd-color-background` | `#191b1c` |
| 기본 패널 | `color.surface` → `--hd-color-surface` | `#222526` |
| 기본 글자 | `color.text` → `--hd-color-text` | `#edf0e9` |
| 보조 글자 | `color.text-muted` → `--hd-color-text-muted` | `#9caca2` |
| 강조색 | `color.accent` → `--hd-color-accent` | `#ffe34c` |
| 좋아요 | `color.like` → `--hd-color-like` | `#ff4057` |
| 입력창 | `color.input` → `--hd-color-input` | `#191f1d` |
| 본문·보조 크기 | `font-size.14`, `font-size.12` | `14px`, `12px` |
| 간격 | `space.8`, `space.16`, `space.24` | `8px`, `16px`, `24px` |
| 모서리 | `radius.6`, `radius.12`, `radius.round` | `6px`, `12px`, `50%` |
| 좋아요 전환 | `duration.400` | `0.4s` |
| 모바일 기준 | `breakpoint.mobile` | `760px` |
| PC 시작 | `breakpoint.desktop-start` | `761px` |

토큰을 수정한 뒤 빌드하면 사용하는 모든 화면에 적용됩니다. 예를 들어 `color.like`를 바꾸면 하트 테두리와 내부 색상이 함께 바뀝니다. `palette-*`, `alpha-*`는 기존 화면의 미세한 색 차이를 그대로 보존한 팔레트입니다. 같은 색은 공유하지만 서로 다른 색을 임의로 합치지는 않았습니다. 새 기능에서는 의미가 명확한 토큰을 우선 사용하세요.

```scss
@use '../styles/tokens' as t;

.example-card {
  color: var(--hd-color-text);
  background: var(--hd-color-surface);
  padding: var(--hd-space-16);
  border-radius: var(--hd-radius-12);
  font-size: var(--hd-font-size-14);
}

@media (max-width: #{t.breakpoint('mobile')}) {
  .example-card {
    padding: var(--hd-space-12);
  }
}
```

미디어 쿼리에서는 CSS 변수를 쓸 수 없으므로 `t.breakpoint()`를 사용합니다. 없는 토큰 이름은 스타일 검사에서 실패하고, 없는 반응형 이름은 Sass 컴파일 시 실패합니다. `0`, 비율·백분율, 그리드 구조, 상속 값은 레이아웃 표현이므로 그대로 유지했습니다. 이미지 드래그 위치·투표 비율 등 실행 중 계산되는 값도 React에서 유지합니다.

## 화면별 파일 찾기

| 위치 | 담당 영역 |
| --- | --- |
| `src/styles/_tokens.scss` | 모든 디자인 토큰과 CSS 변수 생성 |
| `src/app/globals.scss` | 기본 스타일의 로드 순서 |
| `src/app/ui.scss` | Radix UI 보정 스타일의 로드 순서 |
| `src/styles/base/` | 초기화·기본 요소·공통 유틸리티 |
| `src/styles/layout/` | 사이드바·내비게이션·기존 반응형 레이아웃 |
| `src/styles/pages/` | 대시보드·게시판·작성·인증·프로필·운영 화면 |
| `src/styles/components/` | 모달·공용 미디어·에디터 |
| `src/styles/ui/` | UI 컨트롤·검색·달력·로딩·모바일 메뉴 보정 |
| `src/components/helstagram.scss` | 헬스타그램 피드·검색·좋아요 |
| `src/components/photo-viewer.scss` | 사진 슬라이더·확대 보기 |
| `src/components/poll-deadline.scss` | 투표 날짜·시간 선택 |
| `src/components/youtube-video.scss` | 유튜브 영상 비율과 배치 |
| `preview/preview.scss` | GitHub Pages 전용 미리보기 도구 |

SCSS는 `@use`로 연결했습니다. 두 전역 진입점의 모듈 순서는 기존 CSS의 적용 순서를 보존합니다. 특히 `layout/responsive`와 `ui/*`에는 기존 덮어쓰기 규칙이 있으므로 단순히 이름순으로 재정렬하면 안 됩니다. Radix·DayPicker의 패키지 CSS는 라이브러리 원본이며 수정하거나 SCSS로 복제하지 않습니다.

## 동작 코드 찾기

| 위치 | 담당 동작 |
| --- | --- |
| `src/hooks/usePostLike.js` | 좋아요 상태·중복 요청 차단·실패 복원 |
| `src/hooks/usePhotoCarousel.js` | 사진 선택·드래그·스와이프·키보드·확대 상태 |
| `src/components/HelstagramPost.jsx` | 게시글 표시·댓글·동작 연결 |
| `src/components/PhotoCarousel.jsx` | 사진 슬라이더와 확대 보기 렌더링 |
| `src/lib/server/post-validation.js` | 게시글·이미지·유튜브 주소 검증 |
| `src/lib/server/community.js` | 회원·게시글 조회·권한·응답 조립 |
| `scripts/lib/scss.mjs` | GitHub Pages에서 사용하는 Sass 컴파일 어댑터 |

서버의 게시글 검증 함수는 `community.js`에서 다시 내보내므로 기존 API 호출부는 동일하게 동작합니다. 주요 동작은 기존 UI·HTTP 테스트로 검증합니다. 소스 전체에 동일한 Prettier 규칙을 적용했습니다.

## 수정 후 확인

```bash
npm run format
npm run format:check
npm run test:styles
npm run build
npm run test:functional
npm run test:probation
npm run build:pages
```

`test:styles`는 모든 SCSS 진입점의 컴파일, 토큰 누락, 미디어 쿼리의 잘못된 CSS 변수 사용, 직접 작성한 CSS 파일이나 흩어진 색상·글자 크기의 재유입을 검사합니다. CI에서도 포맷·스타일 검사를 실행합니다. Next.js와 Pages는 같은 Sass 패키지를 사용하며 SCSS 소스 자체가 아닌 컴파일된 CSS를 배포합니다.
