import { Button, Label, Select } from '../src/components/ui';
import '@radix-ui/themes/styles.css';
import { UIProvider } from '../src/components/ui';
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import PageSkeleton from '../src/components/PageSkeleton';
import PostHistoryPage from '../src/components/PostHistoryPage';
import { PreviewRouter, usePathname, useRouter } from './router';
import { PreviewProvider, useCommunity, accounts } from './provider';
import { nicknamePattern, nicknameFormatMessage, nicknameTakenMessage } from '../src/lib/nicknames';
import { roleLabels } from '../src/lib/roles';
import Shell from '../src/components/Shell';
import HomePage from '../src/components/HomePage';
import LoginPage from '../src/components/LoginPage';
import SignupPage from '../src/components/SignupPage';
import ProfilePage from '../src/components/ProfilePage';
import BoardPage from '../src/components/BoardPage';
import ArticlePage from '../src/components/ArticlePage';
import BoardEditor from '../src/components/BoardEditor';
import MembersPage from '../src/components/MembersPage';
import RequestsPage from '../src/components/RequestsPage';
import '../src/app/globals.scss';
import '../src/app/ui.scss';
import './preview.scss';

// These two design screens normally ask the Next server for authentication state.
// The Pages bundle answers with fixed preview state and never contacts a backend.
const originalFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin === location.origin && url.pathname === '/api/auth/nickname-check') {
    const nickname = JSON.parse(options?.body || '{}').nickname?.trim() || '';
    const valid = nicknamePattern.test(nickname),
      available =
        valid && !accounts.some((user) => user.nickname.toLowerCase() === nickname.toLowerCase());
    return Promise.resolve(
      new Response(
        JSON.stringify(
          valid
            ? {
                nickname,
                available,
                message: available ? '사용 가능한 닉네임입니다.' : nicknameTakenMessage,
              }
            : { error: nicknameFormatMessage },
        ),
        { status: valid ? 200 : 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );
  }
  if (url.origin === location.origin && url.pathname.startsWith('/api/'))
    return Promise.resolve(
      new Response(
        JSON.stringify(
          url.pathname === '/api/auth/me'
            ? { user: null, demoAuthEnabled: true, kakaoConfigured: false }
            : url.pathname === '/api/auth/signup-info'
              ? { verified: true }
              : { error: '읽기 전용 미리보기입니다.' },
        ),
        {
          status: ['/api/auth/me', '/api/auth/signup-info'].includes(url.pathname) ? 200 : 405,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
  return originalFetch(input, options);
};

function App() {
  const path = usePathname(),
    router = useRouter(),
    { user, account, chooseAccount, notify } = useCommunity();
  const isFrame = window.parent !== window;
  const [showSkeleton, setShowSkeleton] = useState(
    () => new URLSearchParams(location.search).get('skeleton') === '1',
  );
  useEffect(() => {
    if (!isFrame) setShowSkeleton(false);
  }, [path, account, isFrame]);
  useEffect(() => {
    const stopKakao = (event) => {
      if (
        event.target.closest('button')?.textContent.includes('카카오') &&
        ['/login', '/signup'].includes(path)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        notify('카카오 인증은 실제 서버에서 연결됩니다. 상단 계정 선택으로 화면을 확인해주세요.');
      }
    };
    document.addEventListener('click', stopKakao, true);
    return () => document.removeEventListener('click', stopKakao, true);
  }, [path, notify]);
  function visitGuest(destination) {
    chooseAccount(null);
    router.push(destination);
  }
  const pieces = path.split('/').filter(Boolean);
  let page;
  if (path === '/login') page = <LoginPage />;
  else if (path === '/signup') page = <SignupPage />;
  else if (!user) page = <LoginPage />;
  else if (path === '/') page = <HomePage />;
  else if (path === '/profile') page = <ProfilePage />;
  else if (path === '/admin/post-history' && ['operator', 'deputy'].includes(user.role))
    page = <PostHistoryPage />;
  else if (path === '/admin/users' && ['operator', 'deputy'].includes(user.role))
    page = <MembersPage />;
  else if (
    ['/admin/approvals', '/admin/requests'].includes(path) &&
    ['operator', 'deputy'].includes(user.role)
  )
    page = <RequestsPage />;
  else if (
    pieces[0] === 'boards' &&
    ['notice', 'guide', 'talk', 'qna', 'helstagram'].includes(pieces[1])
  ) {
    const board = pieces[1];
    page = !pieces[2] ? (
      <BoardPage board={board} />
    ) : pieces[2] === 'write' ? (
      <BoardEditor board={board} />
    ) : pieces[3] === 'edit' ? (
      <BoardEditor board={board} id={pieces[2]} />
    ) : (
      <ArticlePage board={board} id={pieces[2]} />
    );
  } else
    page = (
      <section className="empty-state">
        <h1>이 화면을 볼 수 없습니다.</h1>
        <a href="#/">메인으로 이동</a>
      </section>
    );
  return (
    <>
      {!isFrame && (
        <header className="pages-preview-bar">
          <div>
            <strong>DESIGN PREVIEW</strong>
            <span>화면 확인 전용 · 실제 인증 및 저장 없음</span>
          </div>
          <nav aria-label="미리보기 설정">
            <Label>
              계정{' '}
              <Select
                aria-label="미리보기 계정"
                value={account}
                onChange={(event) => {
                  chooseAccount(event.target.value);
                  router.push(event.target.value === 'guest' ? '/login' : '/');
                }}
              >
                <option value="guest">로그인 전</option>
                {[
                  ['admin', 'operator'],
                  ['subadmin', 'deputy'],
                  ['user1', 'member'],
                  ['user2', 'apprentice'],
                ].map(([id, role]) => (
                  <option value={id} key={id}>
                    {roleLabels[role]}
                  </option>
                ))}
              </Select>
            </Label>
            <Button onClick={() => visitGuest('/login')}>로그인</Button>
            <Button onClick={() => visitGuest('/signup')}>회원가입</Button>
            <Button aria-pressed={showSkeleton} onClick={() => setShowSkeleton((value) => !value)}>
              {showSkeleton ? '화면 보기' : '스켈레톤 보기'}
            </Button>
            <a
              href="https://github.com/Developer-Kiraku/helldivers2"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          </nav>
        </header>
      )}
      <Shell previewSkeleton={showSkeleton} key={`${path}:${account}`}>
        {showSkeleton ? <PageSkeleton path={path} /> : page}
      </Shell>
    </>
  );
}
createRoot(document.getElementById('root')).render(
  <UIProvider>
    <PreviewRouter>
      <PreviewProvider>
        <App />
      </PreviewProvider>
    </PreviewRouter>
  </UIProvider>,
);
