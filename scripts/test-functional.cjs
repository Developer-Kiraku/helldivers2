/* Runs against an isolated temporary JSON file. Requires npm run build first. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const origin = `http://127.0.0.1:${process.env.TEST_PORT || 3150}`;
let server,
  output = '',
  passed = 0;
async function start(file, { databaseUrl = '' } = {}) {
  output = '';
  server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      new URL(origin).port,
    ],
    {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        JSON_DB_FILE: file,
        APP_ORIGIN: origin,
        COOKIE_SECURE: 'false',
        DEMO_AUTH_ENABLED: 'true',
        SEED_PASSWORD: '1234',
        KAKAO_REST_API_KEY: '',
        KAKAO_CLIENT_SECRET: '',
        OPENAI_API_KEY: '',
      },
    },
  );
  server.stdout.on('data', (chunk) => {
    output += chunk;
  });
  server.stderr.on('data', (chunk) => {
    output += chunk;
  });
  for (let i = 0; i < 200; i++) {
    if (server.exitCode !== null) throw Error(output);
    if (output.includes('Ready in')) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error(`Server timeout: ${output}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill();
  });
}
function client(cookie = '') {
  return {
    cookie,
    async call(url, method = 'GET', body, status = 200, extraHeaders = {}) {
      const headers = {
        Cookie: this.cookie,
        ...(!['GET', 'HEAD'].includes(method)
          ? { Origin: origin, 'Content-Type': 'application/json' }
          : {}),
        ...extraHeaders,
      };
      if (headers.Origin === null) delete headers.Origin;
      const response = await fetch(origin + url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
      });
      const text = await response.text();
      assert.ok(
        (Array.isArray(status) ? status : [status]).includes(response.status),
        `${method} ${url}: expected ${status}, got ${response.status}: ${text.slice(0, 400)}`,
      );
      passed++;
      const cookie = response.headers.get('set-cookie');
      if (cookie?.startsWith('hd_session=')) this.cookie = cookie.split(';')[0];
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { data, response };
    },
  };
}
const draft = (board = 'talk', title = '기능 검증 글') => ({
  board,
  title,
  category:
    board === 'notice'
      ? '공지'
      : board === 'guide'
        ? '무기'
        : board === 'qna'
          ? '질문'
          : board === 'helstagram'
            ? '스크린샷'
            : '잡담',
  content: '임시 JSON에 저장되는 본문',
  bodyHtml:
    '<p>본문 <a href="https://example.com">링크</a><script>alert(1)</script><img src=x onerror=alert(1)></p>',
  images: [],
});
async function run() {
  await import('./test-application-url.mjs');
  await import('./test-post-sharing-history.mjs');
  await import('./test-post-maps.mjs');
  await import('./test-post-views.mjs');
  await import('./test-emoticons.mjs');
  await import('./test-equipment.mjs');
  await import('./test-admin-share-ui.mjs');
  await import('./test-owner-setup.mjs');
  await import('./test-post-html.mjs');
  await import('./test-tiptap.mjs');
  await import('./test-comment-editor.mjs');
  await import('./test-ai-polish.mjs');
  await import('./test-image-upload.mjs');
  await import('./test-auth-security.mjs');
  await import('./test-signup-nickname.mjs');
  await import('./test-helstagram.mjs');
  await import('./test-photo-carousel.mjs');
  await import('./test-dashboard-hero.mjs');
  await fs.mkdir(path.join(root, 'work'), { recursive: true });
  const directory = await fs.mkdtemp(path.join(root, 'work', 'hd-functional-'));
  const file = path.join(directory, 'test-db.json');
  try {
    await start(file);
    const guest = client(),
      admin = client(),
      deputy = client(),
      member = client(),
      apprentice = client();
    for (const route of [
      '/',
      '/profile',
      '/boards/guide',
      '/boards/talk',
      '/admin/users',
      '/admin/requests',
      '/admin/approvals',
      '/admin/post-history',
      '/admin/logs',
    ]) {
      const { response } = await guest.call(route, 'GET', undefined, 307);
      assert.equal(new URL(response.headers.get('location'), origin).pathname, '/login');
    }
    await guest.call('/login');
    const sharingHeaders = (await guest.call('/login')).response.headers;
    assert.match(
      sharingHeaders.get('content-security-policy'),
      /form-action 'self' https:\/\/kauth\.kakao\.com https:\/\/sharer\.kakao\.com https:\/\/accounts\.kakao\.com(?:;|$)/,
    );
    await guest.call('/signup');
    await guest.call('/api/bootstrap', 'GET', undefined, 401);
    await guest.call('/api/admin/requests', 'GET', undefined, 401);
    await guest.call('/api/auth/login', 'POST', { loginId: 'admin', password: '1234' }, 403, {
      Origin: null,
    });
    await guest.call('/api/auth/login', 'POST', { loginId: 'admin', password: '1234' }, 403, {
      Origin: 'https://untrusted.example',
    });
    await guest.call('/api/auth/login', 'POST', { loginId: 'admin', password: 'wrong' }, 401);
    for (const [actor, loginId, nickname, role] of [
      [admin, 'admin', '라미아', 'operator'],
      [deputy, 'subadmin', '부운영자', 'deputy'],
      [member, 'user1', '헬다이버', 'member'],
      [apprentice, 'user2', '견습헬다이버', 'apprentice'],
    ]) {
      const { data, response } = await actor.call('/api/auth/login', 'POST', {
        loginId,
        password: '1234',
      });
      assert.equal(data.user.nickname, nickname);
      assert.equal(data.user.role, role);
      assert.ok(data.user.lastLoginAt);
      assert.ok(data.user.createdAt);
      assert.ok(!('passwordHash' in data.user));
      assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
      for (const route of ['/login', '/signup']) {
        const r = await actor.call(route, 'GET', undefined, 307);
        assert.equal(new URL(r.response.headers.get('location'), origin).pathname, '/');
      }
    }
    await require('./test-private-reports.cjs')({ guest, admin, deputy, member, apprentice });
    await require('./test-emoticons-http.cjs')({ admin, deputy, member });
    await require('./test-equipment-http.cjs')({ admin, member });
    await require('./test-loadout-http.cjs')({ guest, member, deputy });
    const aiDraft = { board: 'talk', title: '테스트', segments: ['맞춤뻡을 고쳐줘'] };
    await guest.call('/api/ai/polish', 'POST', aiDraft, 401);
    await member.call('/api/ai/polish', 'POST', aiDraft, 403, {
      Origin: 'https://untrusted.example',
    });
    await member.call('/api/ai/polish', 'POST', { ...aiDraft, board: 'notice' }, 403);
    await member.call('/api/ai/polish', 'POST', { ...aiDraft, board: 'unknown' }, 400);
    await member.call('/api/ai/polish', 'POST', { ...aiDraft, segments: ['x'.repeat(10001)] }, 400);
    for (const board of ['talk', 'guide', 'qna', 'helstagram'])
      await member.call('/api/ai/polish', 'POST', { ...aiDraft, board }, 503);
    await admin.call('/api/ai/polish', 'POST', { ...aiDraft, board: 'notice' }, 503);
    for (const route of [
      '/',
      '/profile',
      '/boards/notice',
      '/boards/guide',
      '/boards/talk',
      '/boards/guide/write',
      '/boards/qna',
      '/boards/qna/write',
    ])
      await member.call(route);
    await guest.call('/boards/helstagram', 'GET', undefined, 307);
    for (const route of ['/boards/helstagram', '/boards/helstagram/write'])
      await member.call(route);
    const photoDraft = {
      board: 'helstagram',
      title: '분대의 순간',
      category: '스크린샷',
      content: '',
      bodyHtml: '',
      images: ['/images/community-squad.png', '/images/helldivers-logo.png'],
    };
    await guest.call('/api/posts', 'POST', photoDraft, 401);
    await member.call('/api/posts', 'POST', { ...photoDraft, images: [] }, 400);
    await member.call(
      '/api/posts',
      'POST',
      { ...photoDraft, images: Array(11).fill(photoDraft.images[0]) },
      400,
    );
    await member.call(
      '/api/posts',
      'POST',
      { ...photoDraft, images: ['data:image/png;base64,YmFk'] },
      400,
    );
    for (const youtubeUrl of [
      'javascript:alert(1)',
      'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
      'https://example.com/watch?v=M7lc1UVf-VE',
    ])
      await member.call('/api/posts', 'POST', { ...photoDraft, images: [], youtubeUrl }, 400);
    const videoPost = (
      await member.call('/api/posts', 'POST', {
        ...photoDraft,
        images: [],
        youtubeUrl: 'https://youtu.be/M7lc1UVf-VE?t=30',
      })
    ).data.post;
    assert.equal(
      videoPost.youtubeUrl,
      'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?start=30',
    );
    assert.deepEqual(videoPost.images, []);
    assert.equal(
      (await member.call(`/api/posts/${videoPost.id}`)).data.post.youtubeUrl,
      videoPost.youtubeUrl,
    );
    assert.equal(
      (
        await member.call(`/api/posts/${videoPost.id}`, 'PATCH', {
          ...photoDraft,
          youtubeUrl: 'https://www.youtube.com/shorts/M7lc1UVf-VE',
        })
      ).data.post.youtubeUrl,
      'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
    );
    assert.equal(
      (await member.call(`/api/posts/${videoPost.id}`, 'PATCH', { ...photoDraft, youtubeUrl: '' }))
        .data.post.youtubeUrl,
      '',
    );
    await member.call(`/api/posts/${videoPost.id}`, 'DELETE', {});
    const photoPost = (await member.call('/api/posts', 'POST', photoDraft)).data.post;
    assert.deepEqual(photoPost.images, photoDraft.images);
    assert.equal(photoPost.content, '');
    assert.ok(
      (await member.call('/api/bootstrap')).data.posts.helstagram.some(
        (post) => post.id === photoPost.id,
      ),
    );
    await member.call(`/boards/helstagram/${photoPost.id}`);
    await member.call(`/boards/helstagram/${photoPost.id}/edit`);
    await deputy.call(`/api/posts/${photoPost.id}`, 'PATCH', photoDraft, 403);
    const reorderedPhotos = [...photoDraft.images].reverse();
    assert.deepEqual(
      (
        await member.call(`/api/posts/${photoPost.id}`, 'PATCH', {
          ...photoDraft,
          images: reorderedPhotos,
        })
      ).data.post.images,
      reorderedPhotos,
    );
    await member.call(`/api/posts/${photoPost.id}/comments`, 'POST', { body: '멋진 사진이에요!' });
    assert.equal(
      (await member.call(`/api/posts/${photoPost.id}/vote`, 'POST', { value: 1 })).data.post.likes,
      1,
    );
    const likedPhoto = (await member.call(`/api/posts/${photoPost.id}/vote`, 'POST', { value: 1 }))
      .data.post;
    assert.equal(likedPhoto.likes, 1);
    assert.equal(likedPhoto.myVote, 1);
    assert.equal(likedPhoto.dislikes, 0);
    await member.call(`/api/posts/${photoPost.id}/vote`, 'POST', { value: -1 }, 400);
    assert.equal(
      (await member.call(`/api/posts/${photoPost.id}/vote`, 'POST', { value: 0 })).data.post.likes,
      0,
    );
    await member.call(`/api/posts/${photoPost.id}/vote`, 'POST', { value: 1 });
    const tenPhotos = (
      await apprentice.call('/api/posts', 'POST', {
        ...photoDraft,
        images: Array(10).fill(photoDraft.images[0]),
      })
    ).data.post;
    assert.equal(tenPhotos.images.length, 10);
    await apprentice.call(`/api/posts/${tenPhotos.id}`, 'DELETE', {});
    await member.call(`/api/posts/${tenPhotos.id}`, 'GET', undefined, 404);
    // Preview cookies affect presentation only and never change stored membership.
    await guest.call('/api/profile/view-role', 'POST', { role: 'member' }, 401);
    for (const other of [member, deputy, apprentice])
      await other.call('/api/profile/view-role', 'POST', { role: 'operator' }, 403);
    await admin.call('/api/profile/view-role', 'POST', { role: 'guest' }, 400);
    const viewing = client(admin.cookie);
    for (const role of ['deputy', 'member', 'apprentice']) {
      const result = await viewing.call('/api/profile/view-role', 'POST', { role });
      const viewCookie = result.response.headers
        .getSetCookie()
        .find((value) => value.startsWith('hd_view_role='));
      assert.match(viewCookie, /HttpOnly/);
      assert.match(viewCookie, /SameSite=lax/i);
      viewing.cookie = admin.cookie + '; ' + viewCookie.split(';')[0];
      const screen = (await viewing.call('/api/bootstrap')).data;
      assert.equal(screen.user.role, role);
      assert.equal(screen.user.actualRole, 'operator');
      assert.equal((await admin.call('/api/auth/me')).data.user.role, 'operator');
      const dashboard = (await viewing.call('/')).data;
      assert.ok(dashboard.includes('화면 확인용 회원등급'));
      assert.ok(!dashboard.includes('href="/admin/api-keys"'));
      await viewing.call('/api/admin/api-keys', 'GET', undefined, 403);
      await viewing.call('/admin/api-keys', 'GET', undefined, 307);
      await viewing.call('/api/profile', 'PATCH', { nickname: '변경되면안됨' }, 403);
      await viewing.call('/api/posts', 'POST', draft(), 403);
      await viewing.call('/api/ai/polish', 'POST', {}, 403);
      await viewing.call('/api/admin/users', 'GET', undefined, role === 'deputy' ? 200 : 403);
    }
    const restoredView = await viewing.call('/api/profile/view-role', 'POST', { role: 'operator' });
    assert.equal(restoredView.data.user.role, 'operator');
    assert.ok(
      restoredView.response.headers
        .getSetCookie()
        .some((value) => value.startsWith('hd_view_role=;') && value.includes('Max-Age=0')),
    );
    viewing.cookie = admin.cookie;
    await viewing.call('/api/admin/api-keys');
    const forgedPreview = client(member.cookie + '; hd_view_role=operator');
    assert.equal((await forgedPreview.call('/api/bootstrap')).data.user.role, 'member');
    await forgedPreview.call('/api/admin/api-keys', 'GET', undefined, 403);
    await admin.call('/admin/api-keys');
    for (const [account, visible] of [
      [admin, true],
      [deputy, false],
      [member, false],
      [apprentice, false],
    ]) {
      const page = (await account.call('/profile')).data;
      assert.equal(page.includes('href="/admin/api-keys"'), visible);
    }
    await deputy.call('/admin/api-keys', 'GET', undefined, 307);
    await guest.call('/api/admin/api-keys', 'GET', undefined, 401);
    for (const other of [member, deputy]) {
      await other.call('/api/admin/api-keys', 'GET', undefined, 403);
      await other.call('/api/admin/api-keys', 'PATCH', { javaScriptKey: 'a'.repeat(32) }, 403);
    }
    const initialKeys = (await admin.call('/api/admin/api-keys')).data;
    assert.equal(initialKeys.kakao.configured, true);
    assert.ok(initialKeys.serverKeys.every((item) => !('value' in item)));
    await admin.call('/api/admin/api-keys', 'PATCH', { javaScriptKey: 'invalid' }, 400);
    const newKey = 'b'.repeat(32);
    await admin.call('/api/admin/api-keys', 'PATCH', { javaScriptKey: ' ' + newKey + ' ' });
    assert.equal((await member.call('/api/integrations/kakao')).data.javaScriptKey, newKey);
    await admin.call('/api/admin/api-keys', 'PATCH', { javaScriptKey: '' });
    assert.equal((await member.call('/api/integrations/kakao')).data.configured, false);
    await admin.call('/api/admin/api-keys', 'PATCH', {
      javaScriptKey: initialKeys.kakao.javaScriptKey,
    });
    assert.ok((await admin.call('/api/admin/api-keys')).data.updatedAt);
    await guest.call('/api/maps/search?q=test', 'GET', undefined, 401);
    await member.call('/api/maps/search?q=x', 'GET', undefined, 400);
    await member.call('/api/maps/search?q=test', 'GET', undefined, 502);
    await guest.call('/maps/embed?provider=google&address=test', 'GET', undefined, 401);
    await deputy.call('/api/admin/api-keys', 'PATCH', { googleMapsEmbedKey: 'a'.repeat(32) }, 403);
    await admin.call('/api/admin/api-keys', 'PATCH', { googleMapsEmbedKey: 'invalid key' }, 400);
    const mapKeys = (await admin.call('/api/admin/api-keys')).data.maps;
    await admin.call('/api/admin/api-keys', 'PATCH', {
      kakaoMapsJavaScriptKey: 'c'.repeat(32),
      googleMapsEmbedKey: 'd'.repeat(32),
    });
    assert.deepEqual((await member.call('/api/integrations/maps')).data, {
      kakaoConfigured: false,
      googleConfigured: true,
    });
    assert.equal(
      (await admin.call('/api/admin/api-keys')).data.kakao.javaScriptKey,
      initialKeys.kakao.javaScriptKey,
    );
    const qnaCountBeforeMaps = (await member.call('/api/bootstrap')).data.posts.qna.length;
    const placeMap = {
      provider: 'kakao',
      address: '서울특별시 중구 세종대로 110',
      lat: 37.5665,
      lng: 126.978,
    };
    const linkMap = { provider: 'kakao', address: '서울시청', url: 'https://kko.to/example' };
    const googleMap = {
      provider: 'google',
      address: '서울시청',
      embedUrl: 'https://www.google.com/maps/embed?pb=%211m2%212m1',
    };
    const viewedMapIds = [];
    for (const board of ['talk', 'guide', 'qna', 'notice', 'helstagram']) {
      const author = board === 'notice' ? admin : member;
      const item = (
        await author.call('/api/posts', 'POST', {
          ...draft(board, '지도 첨부 검증'),
          content: '',
          bodyHtml: '',
          images: [],
          maps: [placeMap, googleMap, linkMap],
        })
      ).data.post;
      assert.deepEqual(item.maps, [placeMap, googleMap, linkMap]);
      viewedMapIds.push({ id: item.id, author });
      const loadedMap = (await author.call(`/api/posts/${item.id}`)).data.post;
      assert.deepEqual(loadedMap.maps, item.maps);
      assert.equal(loadedMap.views, 0);
      await guest.call(`/api/posts/${item.id}/view`, 'POST', {}, 401);
      const concurrentViews = await Promise.all(
        Array.from({ length: 5 }, () => author.call(`/api/posts/${item.id}/view`, 'POST', {})),
      );
      assert.ok(concurrentViews.every(({ data }) => data.views === 1));
      assert.equal((await apprentice.call(`/api/posts/${item.id}/view`, 'POST', {})).data.views, 2);
      const viewed = (await author.call(`/api/posts/${item.id}`)).data.post;
      assert.equal(viewed.views, 2);
      assert.ok(!('viewReceipts' in viewed));
      assert.equal(
        (await author.call('/api/bootstrap')).data.posts[board].find((p) => p.id === item.id).views,
        2,
      );
      await author.call(`/api/posts/${item.id}`, 'PATCH', {
        ...draft(board, '지도 수정 검증'),
        images: [],
        maps: [googleMap],
      });
      assert.equal((await author.call(`/api/posts/${item.id}`)).data.post.maps.length, 1);
      await author.call(`/api/posts/${item.id}`, 'PATCH', {
        ...draft(board, '지도 삭제 검증'),
        images: [],
        ...(board === 'helstagram'
          ? { youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk' }
          : {}),
        maps: [],
      });
      assert.deepEqual((await author.call(`/api/posts/${item.id}`)).data.post.maps, []);
    }
    await member.call(
      '/api/posts',
      'POST',
      { ...draft(), maps: [{ ...placeMap, lat: '37' }] },
      400,
    );
    await member.call('/api/posts', 'POST', { ...draft(), maps: Array(4).fill(placeMap) }, 400);
    await member.call(
      '/api/posts',
      'POST',
      { ...draft(), maps: [{ ...linkMap, url: 'https://map.kakao.com.evil.example/location' }] },
      400,
    );
    await member.call('/api/posts/missing-post/view', 'POST', {}, 404);
    await member.call(
      '/api/posts',
      'POST',
      { ...draft(), maps: [{ ...googleMap, embedUrl: 'https://evil.example/maps/embed?pb=!1' }] },
      400,
    );
    await member.call(
      '/maps/embed?provider=kakao&address=test&lat=NaN&lng=127',
      'GET',
      undefined,
      400,
    );
    const frame = await member.call('/maps/embed?' + new URLSearchParams(placeMap));
    assert.equal(frame.response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(frame.data, /new kakao.maps.LatLng/);
    const googleFrame = (
      await member.call(
        '/maps/embed?' + new URLSearchParams({ provider: 'google', address: '서울시청' }),
      )
    ).data;
    assert.ok(googleFrame.includes('www.google.com/maps/embed/v1/place'));
    await admin.call('/api/admin/api-keys', 'PATCH', {
      kakaoMapsJavaScriptKey: mapKeys.kakaoJavaScriptKey,
      googleMapsEmbedKey: mapKeys.googleEmbedKey,
    });

    await admin.call('/admin/users');
    await admin.call('/admin/requests', 'GET', undefined, 307);
    await admin.call('/admin/approvals');
    await deputy.call('/admin/users');
    await deputy.call('/admin/requests', 'GET', undefined, 307);
    await deputy.call('/admin/approvals');
    await member.call('/admin/users', 'GET', undefined, 307);
    await member.call('/admin/approvals', 'GET', undefined, 307);
    await guest.call('/api/admin/approvals', 'GET', undefined, 401);
    await member.call('/api/admin/approvals', 'GET', undefined, 403);
    await apprentice.call('/api/admin/approvals', 'GET', undefined, 403);
    for (const staff of [admin, deputy]) {
      const pending = (await staff.call('/api/admin/approvals')).data.requests;
      assert.equal(pending.length, 1);
      assert.equal(pending[0].type, 'member_approval');
      assert.equal(pending[0].targetId, 'u-user2');
      assert.equal(pending[0].canApprove, true);
      assert.equal(pending[0].canReject, false);
    }
    const operatorMembers = (await admin.call('/api/admin/users')).data.users;
    assert.ok(
      operatorMembers.every(
        (user) => !('kakao' in user) && !('passwordHash' in user) && !('approvedBy' in user),
      ),
    );
    assert.ok(
      operatorMembers.filter((user) => user.id !== 'u-admin').every((user) => !('loginId' in user)),
    );
    const privacyResponse = await admin.call('/api/admin/users');
    assert.match(privacyResponse.response.headers.get('cache-control'), /no-store/);
    assert.equal(privacyResponse.response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(privacyResponse.response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(privacyResponse.response.headers.get('referrer-policy'), 'no-referrer');
    await member.call('/api/admin/users/not-a-member/approve', 'POST', {}, 403);
    await member.call('/api/profile', 'PATCH', null, 400);
    await guest.call(
      '/api/auth/login',
      'POST',
      { loginId: 'x'.repeat(2000), password: 'bad' },
      413,
    );
    await guest.call('/api/auth/logout', 'POST', {});
    await admin.call('/api/bootstrap');
    assert.equal(operatorMembers.find((u) => u.id === 'u-admin').canExpel, false);
    assert.equal(operatorMembers.find((u) => u.id === 'u-admin').canChangeRole, false);
    assert.equal(operatorMembers.find((u) => u.id === 'u-subadmin').canExpel, true);
    assert.equal(operatorMembers.find((u) => u.id === 'u-user1').canChangeRole, true);
    const deputyMembers = (await deputy.call('/api/admin/users')).data.users;
    assert.ok(deputyMembers.every((u) => !u.canExpel && !u.canChangeRole));
    assert.ok(
      deputyMembers
        .filter((u) => ['operator', 'deputy'].includes(u.role))
        .every((u) => !u.canRequestExpel),
    );
    assert.ok(
      deputyMembers
        .filter((u) => ['member', 'apprentice'].includes(u.role))
        .every((u) => u.canRequestExpel),
    );
    await deputy.call('/api/admin/users/u-user1', 'PATCH', { role: 'deputy' }, 403);
    await member.call('/api/admin/users', 'GET', undefined, 403);
    await member.call('/api/posts', 'POST', draft('notice'), 403);
    await apprentice.call('/api/posts', 'POST', draft('notice'), 403);
    const sharedBoards = (await member.call('/api/bootstrap')).data.posts;
    assert.equal(sharedBoards.notice.find((p) => p.authorId === 'u-admin').authorRole, 'operator');
    assert.equal(sharedBoards.notice.find((p) => p.authorId === 'u-subadmin').authorRole, 'deputy');
    for (const board of ['notice', 'guide', 'talk', 'qna']) {
      const post = sharedBoards[board][0];
      assert.match(post.sharePath, /^\/s\/[A-Za-z0-9_-]{16}$/);
      const anonymous = await guest.call(post.sharePath);
      assert.match(anonymous.response.headers.get('cache-control'), /no-store/);
      assert.match(anonymous.response.headers.get('set-cookie'), /HttpOnly/);
      const { JSDOM } = await import('jsdom');
      const preview = new JSDOM(anonymous.data).window.document;
      const { postSummary } = await import('../src/lib/post-summary.mjs');
      assert.equal(preview.querySelector('meta[property="og:title"]').content, post.title);
      assert.equal(
        preview.querySelector('meta[property="og:description"]').content,
        postSummary(post),
      );
      assert.equal(preview.querySelector('a').getAttribute('href'), '/login');
      const pendingCookie = anonymous.response.headers.get('set-cookie').split(';')[0];
      const returning = client(`${member.cookie}; ${pendingCookie}`);
      const destination = await returning.call('/', 'GET', undefined, 307);
      assert.equal(
        new URL(destination.response.headers.get('location'), origin).pathname,
        post.sharePath,
      );
      const resolved = await returning.call(post.sharePath, 'GET', undefined, 307);
      assert.equal(
        new URL(resolved.response.headers.get('location'), origin).pathname,
        `/boards/${board}/${post.id}`,
      );
      assert.match(resolved.response.headers.get('set-cookie'), /Max-Age=0/i);
    }
    await guest.call('/s/invalid', 'GET', undefined, 404);
    await guest.call('/s/AAAAAAAAAAAAAAAA', 'GET', undefined, 404);
    const removable = (await member.call('/api/posts', 'POST', draft('talk', '공유 삭제 검증')))
      .data.post;
    await member.call('/api/posts/' + removable.id, 'DELETE');
    await member.call('/api/posts/' + removable.id + '/view', 'POST', {}, 404);
    await member.call(removable.sharePath, 'GET', undefined, 404);
    const untrustedReturn = await client(
      `${member.cookie}; hd_shared_post=https%3A%2F%2Funtrusted.example`,
    ).call('/');
    assert.equal(untrustedReturn.response.status, 200);
    assert.equal(sharedBoards.qna.length, qnaCountBeforeMaps + 1);
    const rich = (
      await member.call('/api/posts', 'POST', {
        ...draft('guide', 'HTML 영상 검증'),
        content: '',
        bodyHtml: '<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE"></iframe>',
      })
    ).data.post;
    assert.match(rich.bodyHtml, /youtube-nocookie.com/);
    const richEdit = (
      await member.call('/api/posts/' + rich.id, 'PATCH', {
        ...draft('guide', 'HTML 영상 수정'),
        bodyHtml:
          '<p><span style="font-size:17px;color:#65afff"><strong><em><u><s>세밀한 글자</s></u></em></strong></span></p><iframe src="https://youtu.be/M7lc1UVf-VE?t=62"></iframe><iframe src="https://attacker.example"></iframe><script>alert(1)</script>',
      })
    ).data.post;
    assert.match(richEdit.bodyHtml, /font-size:17px/);
    assert.match(richEdit.bodyHtml, /color:#65afff/);
    assert.ok(richEdit.bodyHtml.includes('<strong><em><u><s>세밀한 글자</s></u></em></strong>'));
    assert.match(richEdit.bodyHtml, /start=62/);
    assert.ok(!/attacker|script/.test(richEdit.bodyHtml));
    assert.equal(
      (await member.call('/api/posts/' + rich.id)).data.post.bodyHtml,
      richEdit.bodyHtml,
    );
    await member.call(
      '/api/posts',
      'POST',
      {
        ...draft('guide'),
        content: '',
        bodyHtml: '<iframe src="https://attacker.example"></iframe>',
      },
      400,
    );
    await member.call('/api/posts/' + rich.id, 'DELETE');
    const question = (await member.call('/api/posts', 'POST', draft('qna', '장비 질문'))).data.post;
    await member.call('/boards/qna/' + question.id);
    await member.call('/boards/qna/' + question.id + '/edit');
    for (const board of ['talk', 'qna']) {
      const item =
        board === 'qna'
          ? question
          : (await member.call('/api/posts', 'POST', draft('talk', '목록 댓글 테스트'))).data.post;
      await guest.call(
        '/api/posts/' + item.id + '/comments',
        'POST',
        { body: '접근 차단 확인' },
        401,
      );
      await member.call('/api/posts/' + item.id + '/comments', 'POST', { body: '   ' }, 400);
      const answer = (
        await deputy.call('/api/posts/' + item.id + '/comments', 'POST', {
          body: '목록에서 작성한 답변',
        })
      ).data.comment;
      const detail = (await member.call('/api/posts/' + item.id)).data;
      assert.equal(detail.comments.find((c) => c.id === answer.id).authorRole, 'deputy');
      assert.equal(detail.comments.length, 1);
      assert.equal(detail.comments[0].id, answer.id);
      assert.equal(detail.comments[0].body, '목록에서 작성한 답변');
      const listed = (await member.call('/api/bootstrap')).data.posts[board].find(
        (p) => p.id === item.id,
      );
      assert.equal(listed.comments, 1);
    }
    await member.call('/api/posts/' + question.id, 'PATCH', {
      ...draft('qna'),
      title: '수정된 장비 질문',
    });
    const notice = (await deputy.call('/api/posts', 'POST', draft('notice'))).data.post;
    const pinnedNotice = (
      await admin.call('/api/posts', 'POST', { ...draft('notice', '상단 고정 검증'), pinned: true })
    ).data.post;
    assert.equal(pinnedNotice.pinned, true);
    const normalNotice = (
      await deputy.call('/api/posts', 'POST', draft('notice', '일반 공지 검증'))
    ).data.post;
    assert.equal(normalNotice.pinned, false);
    let noticeList = (await member.call('/api/bootstrap')).data.posts.notice;
    assert.ok(
      noticeList.findIndex((p) => p.id === pinnedNotice.id) <
        noticeList.findIndex((p) => p.id === normalNotice.id),
    );
    await admin.call(`/api/posts/${pinnedNotice.id}`, 'PATCH', draft('notice', '고정 유지 검증'));
    assert.equal((await admin.call(`/api/posts/${pinnedNotice.id}`)).data.post.pinned, true);
    await member.call(
      `/api/posts/${pinnedNotice.id}`,
      'PATCH',
      { ...draft('notice'), pinned: false },
      403,
    );
    await admin.call(`/api/posts/${pinnedNotice.id}`, 'PATCH', {
      ...draft('notice'),
      pinned: false,
    });
    assert.equal((await admin.call(`/api/posts/${pinnedNotice.id}`)).data.post.pinned, false);
    await deputy.call(`/api/posts/${normalNotice.id}`, 'PATCH', {
      ...draft('notice'),
      pinned: true,
    });
    assert.equal((await deputy.call(`/api/posts/${normalNotice.id}`)).data.post.pinned, true);
    await admin.call('/api/posts', 'POST', { ...draft('notice'), pinned: 'true' }, 400);
    await member.call('/api/posts', 'POST', { ...draft('guide'), pinned: true }, 400);
    await admin.call(`/api/posts/${pinnedNotice.id}`, 'DELETE', {});
    await deputy.call(`/api/posts/${normalNotice.id}`, 'DELETE', {});

    const post = (await member.call('/api/posts', 'POST', draft())).data.post;
    const guide = (await apprentice.call('/api/posts', 'POST', draft('guide'))).data.post;
    assert.ok(!post.bodyHtml.includes('<script'));
    assert.ok(!post.bodyHtml.includes('onerror'));
    assert.match(post.bodyHtml, /noopener noreferrer/);
    await member.call(`/api/posts/${post.id}`, 'PATCH', { ...draft(), title: '수정된 글' });
    await apprentice.call(`/api/posts/${post.id}`, 'PATCH', draft(), 403);
    await deputy.call(`/api/posts/${post.id}`, 'DELETE', {}, 403);
    await apprentice.call(`/api/posts/${post.id}`, 'DELETE', {}, 403);
    await guest.call('/api/admin/post-history', 'GET', undefined, 401);
    await member.call('/api/admin/post-history', 'GET', undefined, 403);
    await apprentice.call('/api/admin/post-history', 'GET', undefined, 403);
    await member.call('/admin/post-history', 'GET', undefined, 307);
    await admin.call('/admin/post-history', 'GET', undefined, 307);
    await admin.call('/admin/logs');
    await deputy.call('/admin/logs');
    await guest.call('/api/admin/logs', 'GET', undefined, 401);
    await member.call('/api/admin/logs', 'GET', undefined, 403);
    await apprentice.call('/api/admin/logs', 'GET', undefined, 403);
    await member.call('/admin/logs', 'GET', undefined, 307);
    const history = (
      await admin.call('/api/admin/post-history?q=' + encodeURIComponent('수정된 글'))
    ).data;
    const updated = history.logs.find((entry) => entry.postId === post.id);
    assert.ok(updated);
    assert.ok(!('before' in updated));
    const detailPath = '/api/admin/post-history/' + updated.id;
    await guest.call(detailPath, 'GET', undefined, 401);
    await member.call(detailPath, 'GET', undefined, 403);
    await deputy.call('/admin/post-history', 'GET', undefined, 307);
    const revision = (await deputy.call(detailPath)).data.log;
    assert.equal(revision.before.title, post.title);
    assert.equal(revision.after.title, '수정된 글');
    assert.equal(revision.actorNickname, '헬다이버');
    assert.deepEqual(revision.changedFields, ['title']);
    const compact = (
      await deputy.call('/api/admin/logs?type=post_update&q=' + encodeURIComponent('수정된 글'))
    ).data.logs.find((entry) => entry.targetName === '수정된 글');
    assert.equal(compact.targetCreatedAt, post.createdAt);
    assert.equal(compact.actorNickname, '헬다이버');
    assert.ok(!('before' in compact) && !('content' in compact));
    await admin.call('/api/admin/post-history/missing', 'GET', undefined, 404);
    const deletedHistory = (await deputy.call('/api/admin/post-history?action=post.delete')).data;
    const removed = deletedHistory.logs.find((entry) => entry.postId === removable.id);
    assert.ok(removed.deleted);
    assert.equal(
      (await admin.call('/api/admin/post-history/' + removed.id)).data.log.before.title,
      '공유 삭제 검증',
    );
    await member.call('/api/posts', 'POST', { ...draft(), category: '없는 분류' }, 400);
    await member.call(
      '/api/posts',
      'POST',
      { ...draft(), images: Array(6).fill('/images/community-squad.png') },
      400,
    );
    await member.call('/api/profile', 'PATCH', { nickname: '라미아' }, 409);
    await member.call('/api/profile', 'PATCH', { photo: 'data:image/svg+xml;base64,abcd' }, 400);
    const sharp = (await import('sharp')).default;
    const photo =
      'data:image/png;base64,' +
      (
        await sharp({ create: { width: 3200, height: 1800, channels: 3, background: '#557766' } })
          .png()
          .toBuffer()
      ).toString('base64');
    const profile = (
      await member.call('/api/profile', 'PATCH', {
        nickname: '테스트헬다이버',
        photo,
        role: 'operator',
        loginId: 'evil',
      })
    ).data.user;
    assert.equal(profile.role, 'member');
    assert.equal(profile.loginId, 'user1');
    assert.equal(
      (await sharp(Buffer.from(profile.photo.split(',')[1], 'base64')).metadata()).width,
      256,
    );
    const resizedPost = (
      await member.call('/api/posts', 'POST', {
        ...draft(),
        images: [photo],
        bodyHtml: `<p>대형 사진</p><img src="${photo}">`,
      })
    ).data.post;
    assert.equal(
      (await sharp(Buffer.from(resizedPost.images[0].split(',')[1], 'base64')).metadata()).width,
      1600,
    );
    assert.ok(resizedPost.bodyHtml.includes(resizedPost.images[0]));
    await member.call(
      '/api/profile',
      'PATCH',
      { photo: 'data:image/png;base64,iVBORw0KGgo=' },
      400,
    );
    const author = (await admin.call(`/api/posts/${post.id}`)).data.post;
    assert.equal(author.author, '테스트헬다이버');
    assert.equal(author.authorPhoto, profile.photo);
    await member.call(`/api/posts/${post.id}/comments`, 'POST', { body: '저장되는 댓글' });
    assert.ok(
      (await member.call(`/api/posts/${post.id}`)).data.comments.some(
        (c) => c.body === '저장되는 댓글',
      ),
    );
    for (const value of [1, 1, -1])
      await member.call(`/api/posts/${post.id}/vote`, 'POST', { value });
    const voted = (await member.call(`/api/posts/${post.id}`)).data.post;
    assert.equal(voted.likes, 0);
    assert.equal(voted.dislikes, 1);
    assert.equal(voted.myVote, -1);
    const voteLogTitle = '추천 로그 검증 전용 글';
    const voteLogPost = (await admin.call('/api/posts', 'POST', draft('talk', voteLogTitle))).data
      .post;
    for (const value of [0, 1, 1, 0, 0, -1, -1, 0, 1, -1])
      await member.call(`/api/posts/${voteLogPost.id}/vote`, 'POST', { value });
    const voteQuery = encodeURIComponent(voteLogTitle);
    const voteLogs = (await admin.call(`/api/admin/logs?q=${voteQuery}`)).data;
    assert.equal(voteLogs.total, 6);
    for (const [type, count] of [
      ['post_like', 2],
      ['post_dislike', 2],
      ['post_like_cancel', 1],
      ['post_dislike_cancel', 1],
    ]) {
      const filtered = (await deputy.call(`/api/admin/logs?type=${type}&q=${voteQuery}`)).data;
      assert.equal(filtered.total, count);
      assert.ok(
        filtered.logs.every(
          (entry) =>
            entry.type === type &&
            entry.targetName === voteLogTitle &&
            entry.actorNickname === profile.nickname &&
            entry.targetCreatedAt === voteLogPost.createdAt,
        ),
      );
    }
    await member.call(`/api/posts/${voteLogPost.id}/vote`, 'POST', { value: 2 }, 400);
    assert.equal((await admin.call(`/api/admin/logs?q=${voteQuery}`)).data.total, 6);
    // Polls keep ballots separate from recommendation votes and never expose anonymous identities.
    const pollDraft = {
      question: '오늘의 작전 시간?',
      options: ['21시', '22시', '23시'],
      multiple: false,
      anonymous: true,
      endsAt: null,
    };
    for (const board of ['notice', 'guide', 'talk']) {
      const actor = board === 'notice' ? admin : member;
      const item = (await actor.call('/api/posts', 'POST', { ...draft(board), poll: pollDraft }))
        .data.post;
      assert.equal(item.poll.options.length, 3);
      assert.equal(item.content, draft(board).content);
    }
    for (const poll of [
      { ...pollDraft, options: ['하나'] },
      { ...pollDraft, options: ['중복', '중복'] },
      { ...pollDraft, endsAt: 'bad' },
      { ...pollDraft, endsAt: '2000-01-01T00:00:00Z' },
    ])
      await member.call('/api/posts', 'POST', { ...draft(), poll }, 400);
    const pollPost = (await member.call('/api/posts', 'POST', { ...draft(), poll: pollDraft })).data
      .post;
    const pollUrl = '/api/posts/' + pollPost.id + '/poll',
      optionIds = pollPost.poll.options.map((o) => o.id);
    await guest.call(pollUrl, 'POST', { choices: [optionIds[0]] }, 401);
    await member.call(pollUrl, 'POST', { choices: ['fake'] }, 400);
    await member.call(pollUrl, 'POST', { choices: optionIds.slice(0, 2) }, 400);
    await Promise.all([
      member.call(pollUrl, 'POST', { choices: [optionIds[0]] }),
      client(member.cookie).call(pollUrl, 'POST', { choices: [optionIds[0]] }),
    ]);
    let pollResult = (await admin.call('/api/posts/' + pollPost.id)).data.post.poll;
    assert.equal(pollResult.totalVoters, 1);
    assert.equal(pollResult.options[0].count, 1);
    assert.ok(!JSON.stringify(pollResult).includes('u-user1'));
    assert.ok(!('ballots' in pollResult));
    assert.ok(!('voters' in pollResult.options[0]));
    await member.call(pollUrl, 'POST', { choices: [optionIds[1]] });
    await apprentice.call(pollUrl, 'POST', { choices: [optionIds[2]] });
    await member.call('/api/posts/' + pollPost.id, 'PATCH', {
      ...draft(),
      poll: { ...pollDraft, options: ['교체', '시도'] },
    });
    pollResult = (await member.call('/api/posts/' + pollPost.id)).data.post.poll;
    assert.equal(pollResult.totalVoters, 2);
    assert.equal(pollResult.options[0].count, 0);
    assert.equal(pollResult.options[1].count, 1);
    assert.deepEqual(pollResult.myChoices, [optionIds[1]]);
    await member.call(pollUrl, 'POST', { choices: [] });
    assert.equal((await member.call('/api/posts/' + pollPost.id)).data.post.poll.totalVoters, 1);
    await admin.call(pollUrl, 'PATCH', { close: true }, 403);
    await member.call(pollUrl, 'PATCH', { close: true });
    await member.call(pollUrl, 'POST', { choices: [optionIds[0]] }, 409);
    const publicPoll = (
      await member.call('/api/posts', 'POST', {
        ...draft('guide'),
        poll: { ...pollDraft, multiple: true, anonymous: false },
      })
    ).data.post;
    await member.call('/api/posts/' + publicPoll.id + '/poll', 'POST', {
      choices: publicPoll.poll.options.slice(0, 2).map((o) => o.id),
    });
    pollResult = (await admin.call('/api/posts/' + publicPoll.id)).data.post.poll;
    assert.equal(pollResult.totalVoters, 1);
    assert.equal(pollResult.options[0].count, 1);
    assert.equal(pollResult.options[1].count, 1);
    assert.deepEqual(pollResult.options[0].voters, ['테스트헬다이버']);
    const scheduledPoll = (
      await member.call('/api/posts', 'POST', {
        ...draft(),
        poll: { ...pollDraft, endsAt: new Date(Date.now() + 3600000).toISOString() },
      })
    ).data.post;
    await member.call('/api/posts/' + scheduledPoll.id + '/poll', 'POST', {
      choices: [scheduledPoll.poll.options[0].id],
    });
    await member.call(pollUrl, 'PATCH', { close: true }, 409);
    await member.call(
      '/api/posts/' + publicPoll.id + '/poll',
      'POST',
      { choices: [publicPoll.poll.options[0].id, publicPoll.poll.options[0].id] },
      400,
    );
    const requests = '/api/admin/requests';
    await member.call(
      requests,
      'POST',
      { type: 'post_delete', targetId: guide.id, reason: '검토 요청' },
      403,
    );
    await deputy.call(
      requests,
      'POST',
      { type: 'post_delete', targetId: notice.id, reason: '검토 요청' },
      403,
    );
    const req = (
      await deputy.call(requests, 'POST', {
        type: 'post_delete',
        targetId: post.id,
        reason: '게시글 검토',
      })
    ).data.request;
    assert.ok(
      (await admin.call('/api/admin/approvals')).data.requests.some((r) => r.id === req.id),
    );
    assert.ok(
      (await deputy.call('/api/admin/approvals')).data.requests.every(
        (r) => r.type === 'member_approval',
      ),
    );
    await deputy.call(
      requests,
      'POST',
      { type: 'post_delete', targetId: post.id, reason: '중복 검토' },
      409,
    );
    await member.call(requests, 'GET', undefined, 403);
    assert.ok((await admin.call(requests)).data.requests.some((r) => r.id === req.id));
    await deputy.call(`${requests}/${req.id}/review`, 'POST', { decision: 'approved' }, 403);
    await admin.call(`${requests}/${req.id}/review`, 'POST', {
      decision: 'approved',
      note: '삭제 승인',
    });
    await admin.call(`${requests}/${req.id}/review`, 'POST', { decision: 'approved' }, 409);
    await member.call(`/api/posts/${post.id}`, 'GET', undefined, 404);
    const approvedHistory = (
      await admin.call('/api/admin/post-history?action=post.delete.approved')
    ).data;
    const approvedDelete = approvedHistory.logs.find((entry) => entry.postId === post.id);
    assert.equal(approvedDelete.reason, '게시글 검토');
    assert.equal(approvedDelete.requesterNickname, '부운영자');
    const deletedRevision = (await admin.call('/api/admin/post-history/' + approvedDelete.id)).data
      .log;
    assert.equal(deletedRevision.before.title, '수정된 글');
    assert.equal(deletedRevision.after, null);
    assert.equal(
      (await admin.call('/api/admin/approvals')).data.requests.find((r) => r.id === req.id).status,
      'approved',
    );
    const rejected = (
      await deputy.call(requests, 'POST', {
        type: 'post_delete',
        targetId: guide.id,
        reason: '거부 테스트',
      })
    ).data.request;
    await admin.call(`${requests}/${rejected.id}/review`, 'POST', {
      decision: 'rejected',
      note: '유지',
    });
    await member.call(`/api/posts/${guide.id}`);
    const stale = (
      await deputy.call(requests, 'POST', {
        type: 'user_expel',
        targetId: 'u-user1',
        reason: '등급 변경 검증',
      })
    ).data.request;
    await admin.call('/api/admin/users/u-user1', 'PATCH', { role: 'deputy' });
    await admin.call(`${requests}/${stale.id}/review`, 'POST', { decision: 'approved' }, 409);
    await admin.call(`${requests}/${stale.id}/review`, 'POST', { decision: 'rejected' });
    await admin.call('/api/admin/users/u-user1', 'PATCH', { role: 'operator' }, 403);
    await admin.call('/api/admin/users/u-user1', 'PATCH', { role: 'member' });
    await deputy.call('/api/admin/users/u-user2/expel', 'POST', { reason: '직접 강퇴 금지' }, 403);
    const expel = (
      await deputy.call(requests, 'POST', {
        type: 'user_expel',
        targetId: 'u-user2',
        reason: '강퇴 승인 테스트',
      })
    ).data.request;
    const results = await Promise.all([
      admin.call(`${requests}/${expel.id}/review`, 'POST', { decision: 'approved' }, [200, 409]),
      client(admin.cookie).call(
        `${requests}/${expel.id}/review`,
        'POST',
        { decision: 'approved' },
        [200, 409],
      ),
    ]);
    assert.deepEqual(results.map((r) => r.response.status).sort(), [200, 409]);
    await apprentice.call('/api/bootstrap', 'GET', undefined, 401);
    await guest.call('/api/auth/login', 'POST', { loginId: 'user2', password: '1234' }, 401);
    const expelled = (await admin.call('/api/admin/users')).data.users.find(
      (u) => u.id === 'u-user2',
    );
    assert.equal(expelled.canExpel, false);
    assert.equal(expelled.canChangeRole, false);
    assert.equal(expelled.canApprove, false);
    const expelLogs = (await admin.call('/api/admin/logs?type=member_expel')).data.logs;
    const expelledLog = expelLogs.find((entry) => entry.targetName === '견습헬다이버');
    assert.equal(expelledLog.reason, '강퇴 승인 테스트');
    assert.equal(expelledLog.actorNickname, '라미아');
    assert.ok(expelledLog.targetCreatedAt);
    await admin.call(`/api/posts/${notice.id}`, 'DELETE', {});
    await deputy.call(`/api/posts/${notice.id}`, 'GET', undefined, 404);
    const own = (await member.call('/api/posts', 'POST', draft())).data.post;
    await member.call(`/api/posts/${own.id}`, 'DELETE', {});
    const concurrent = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        member.call('/api/posts', 'POST', draft('guide', `동시 저장 ${i}`)),
      ),
    );
    for (let i = 0; i < 8; i++)
      await guest.call(
        '/api/auth/login',
        'POST',
        { loginId: 'security-rate-check', password: 'wrong' },
        401,
        { 'X-Forwarded-For': `192.0.2.${i}` },
      );
    await guest.call(
      '/api/auth/login',
      'POST',
      { loginId: 'security-rate-check', password: 'wrong' },
      429,
      { 'X-Forwarded-For': '198.51.100.1' },
    );
    let db = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(db.posts.filter((p) => p.title.startsWith('동시 저장')).length, 5);
    assert.ok(db.users.every((u) => !u.passwordHash || u.passwordHash !== '1234'));
    assert.ok(db.sessions.every((s) => s.tokenHash !== admin.cookie.split('=')[1]));
    await stop();
    // Stand in for a completed Kakao provider exchange, only in the isolated test DB.
    const ticket = randomBytes(32).toString('hex'),
      raceTickets = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')],
      expiredTicket = randomBytes(32).toString('hex');
    db = JSON.parse(await fs.readFile(file, 'utf8'));
    db.posts.find((p) => p.id === scheduledPoll.id).poll.endsAt = new Date(
      Date.now() - 1000,
    ).toISOString();
    db.votes.push({ postId: photoPost.id, userId: 'u-subadmin', value: -1 });
    db.users.push({
      ...db.users.find((user) => user.id === 'u-admin'),
      id: 'security-session-test',
      loginId: 'security-session-test',
      nickname: '세션검증',
      role: 'member',
    });
    db.pendingRegistrations = [
      ...raceTickets.map((value, index) => ({
        ticketHash: createHash('sha256').update(value).digest('hex'),
        kakaoId: 'nickname-race-' + index,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      })),
      {
        ticketHash: createHash('sha256').update(expiredTicket).digest('hex'),
        kakaoId: 'expired-check',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      {
        ticketHash: createHash('sha256').update(ticket).digest('hex'),
        kakaoId: 'test-kakao-verified-1',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      },
    ];
    await fs.writeFile(file, JSON.stringify(db));
    await start(file);
    for (const { id, author } of viewedMapIds) {
      assert.equal((await member.call(`/api/posts/${id}`)).data.post.views, 2);
      assert.equal((await author.call(`/api/posts/${id}/view`, 'POST', {})).data.views, 2);
    }
    assert.equal((await admin.call(detailPath)).data.log.before.title, post.title);
    assert.deepEqual(
      (await member.call(`/api/posts/${photoPost.id}`)).data.post.images,
      reorderedPhotos,
    );
    assert.equal(
      (await member.call('/api/posts/' + question.id)).data.comments[0].body,
      '목록에서 작성한 답변',
    );
    assert.equal(
      (await member.call('/api/bootstrap')).data.posts.qna.find((p) => p.id === question.id).title,
      '수정된 장비 질문',
    );
    assert.equal((await admin.call('/api/posts/' + scheduledPoll.id)).data.post.poll.closed, true);
    await member.call('/api/posts/' + scheduledPoll.id + '/poll', 'POST', { choices: [] }, 409);
    assert.equal((await admin.call('/api/posts/' + pollPost.id)).data.post.poll.closed, true);
    assert.equal((await admin.call('/api/posts/' + publicPoll.id)).data.post.poll.totalVoters, 1);
    await admin.call('/api/bootstrap');
    assert.equal((await member.call('/api/auth/me')).data.user.nickname, '테스트헬다이버');
    await member.call(`/api/posts/${concurrent[0].data.post.id}`);
    assert.equal(
      (await admin.call(requests)).data.requests.find((r) => r.id === req.id).status,
      'approved',
    );
    const signup = client(`hd_signup=${ticket}`);
    assert.equal((await signup.call('/api/auth/signup-info')).data.verified, true);
    const legacyPhoto = (await deputy.call(`/api/posts/${photoPost.id}`)).data.post;
    assert.equal(legacyPhoto.dislikes, 0);
    assert.equal(legacyPhoto.myVote, 0);
    assert.equal(legacyPhoto.likes, 1);
    await guest.call(
      '/api/auth/login',
      'POST',
      { loginId: 'security-rate-check', password: 'wrong' },
      429,
      { 'X-Forwarded-For': '203.0.113.1' },
    );
    const sessionClients = Array.from({ length: 6 }, () => client());
    for (const sessionClient of sessionClients)
      await sessionClient.call('/api/auth/login', 'POST', {
        loginId: 'security-session-test',
        password: '1234',
      });
    await sessionClients[0].call('/api/bootstrap', 'GET', undefined, 401);
    await sessionClients[5].call('/api/bootstrap');
    const nicknameUrl = '/api/auth/nickname-check';
    await guest.call(nicknameUrl, 'POST', { nickname: '신입대원' }, 401);
    await client('hd_signup=tampered').call(nicknameUrl, 'POST', { nickname: '신입대원' }, 401);
    await client('hd_signup=' + expiredTicket).call(
      nicknameUrl,
      'POST',
      { nickname: '신입대원' },
      401,
    );
    await signup.call(nicknameUrl, 'POST', { nickname: '신입대원' }, 403, {
      Origin: 'https://untrusted.example',
    });
    for (const nickname of ['', '한', '공백 포함', '<script>', 'a'.repeat(17)])
      await signup.call(nicknameUrl, 'POST', { nickname }, 400);
    await signup.call(nicknameUrl, 'POST', null, 400);
    const takenCheck = (await signup.call(nicknameUrl, 'POST', { nickname: '라미아' })).data;
    assert.equal(takenCheck.available, false);
    assert.deepEqual(Object.keys(takenCheck).sort(), ['available', 'message', 'nickname']);
    const freeCheck = await signup.call(nicknameUrl, 'POST', { nickname: '  신입대원  ' });
    assert.equal(freeCheck.data.available, true);
    assert.equal(freeCheck.data.nickname, '신입대원');
    assert.match(freeCheck.response.headers.get('cache-control'), /no-store/);
    await signup.call(
      '/api/auth/register',
      'POST',
      { nickname: '라미아', agreements: { age: true, terms: true, collect: true } },
      409,
    );
    const racers = raceTickets.map((value) => client('hd_signup=' + value));
    for (const actor of racers)
      assert.equal(
        (await actor.call(nicknameUrl, 'POST', { nickname: 'UniqueDiver' })).data.available,
        true,
      );
    const nicknameRaces = await Promise.all(
      racers.map((actor, index) =>
        actor.call(
          '/api/auth/register',
          'POST',
          {
            nickname: index ? 'uniquediver' : 'UniqueDiver',
            agreements: { age: true, terms: true, collect: true },
          },
          [201, 409],
        ),
      ),
    );
    assert.deepEqual(nicknameRaces.map((result) => result.response.status).sort(), [201, 409]);
    assert.equal(
      (await signup.call(nicknameUrl, 'POST', { nickname: 'UNIQUEDIVER' })).data.available,
      false,
    );
    await signup.call(
      '/api/auth/register',
      'POST',
      { nickname: '신입대원', agreements: { age: 'true', terms: true, collect: true } },
      400,
    );
    const registered = (
      await signup.call(
        '/api/auth/register',
        'POST',
        {
          nickname: '신입대원',
          role: 'operator',
          agreements: { age: true, terms: true, collect: true },
        },
        201,
      )
    ).data.user;
    await client('hd_signup=' + ticket).call(
      '/api/auth/nickname-check',
      'POST',
      { nickname: '다른이름' },
      401,
    );
    assert.equal(registered.role, 'apprentice');
    assert.equal(registered.kakao.id, 'test-kakao-verified-1');
    assert.equal(registered.probationStartedAt, registered.createdAt);
    assert.ok(Date.parse(registered.probationExpiresAt) > Date.parse(registered.createdAt));
    assert.equal(registered.approvedAt, null);
    const joinLog = (
      await admin.call('/api/admin/logs?type=member_join&q=' + encodeURIComponent('신입대원'))
    ).data.logs[0];
    assert.equal(joinLog.actorNickname, '신입대원');
    assert.equal(joinLog.targetName, '신입대원');
    assert.equal(joinLog.targetCreatedAt, registered.createdAt);
    await signup.call('/api/bootstrap');
    assert.ok(
      (await deputy.call('/api/admin/approvals')).data.requests.some(
        (r) =>
          r.type === 'member_approval' && r.targetId === registered.id && r.status === 'pending',
      ),
    );
    await member.call(`/api/admin/users/${registered.id}/approve`, 'POST', {}, 403);
    await deputy.call(`/api/admin/users/${registered.id}/approve`, 'POST', {});
    for (const staff of [admin, deputy]) {
      const approvals = (await staff.call('/api/admin/approvals')).data.requests;
      assert.ok(!approvals.some((r) => r.targetId === registered.id && r.status === 'pending'));
      assert.ok(
        approvals.some(
          (r) =>
            r.targetId === registered.id &&
            r.status === 'approved' &&
            r.reviewerNickname === '부운영자',
        ),
      );
    }
    await client(`hd_signup=${ticket}`).call(
      '/api/auth/register',
      'POST',
      { nickname: '재사용검증', agreements: { age: true, terms: true, collect: true } },
      401,
    );
    const second = client();
    await second.call('/api/auth/login', 'POST', { loginId: 'user1', password: '1234' });
    await member.call('/api/profile', 'DELETE', { confirm: false }, 400);
    await member.call('/api/profile', 'DELETE', { confirm: true });
    const leaveLog = (
      await admin.call(
        '/api/admin/logs?type=member_leave&q=' + encodeURIComponent('테스트헬다이버'),
      )
    ).data.logs[0];
    assert.equal(leaveLog.targetName, '테스트헬다이버');
    assert.equal(leaveLog.actorNickname, '테스트헬다이버');
    assert.ok(leaveLog.targetCreatedAt);
    await second.call('/api/bootstrap', 'GET', undefined, 401);
    await guest.call('/api/auth/login', 'POST', { loginId: 'user1', password: '1234' }, 401);
    assert.equal(
      (await admin.call(`/api/posts/${concurrent[0].data.post.id}`)).data.post.author,
      '탈퇴한 회원',
    );
    await admin.call('/api/profile', 'DELETE', { confirm: true }, 403);
    await admin.call('/api/admin/users/u-admin/expel', 'POST', { reason: '본인 강퇴 금지' }, 403);
    await admin.call('/api/admin/users/u-subadmin/expel', 'POST', { reason: '하위 부운영자 강퇴' });
    await deputy.call('/api/bootstrap', 'GET', undefined, 401);
    await client('hd_session=tampered').call('/api/bootstrap', 'GET', undefined, 401);
    await guest.call(
      '/api/auth/register',
      'POST',
      { nickname: '가입검증', agreements: { age: true, terms: true, collect: true } },
      401,
    );
    assert.equal((await guest.call('/api/auth/signup-info')).data.verified, false);
    for (const url of ['/api/auth/kakao', '/api/auth/kakao/callback?code=fake&state=fake']) {
      const result = await guest.call(url, 'GET', undefined, 307);
      assert.equal(new URL(result.response.headers.get('location'), origin).pathname, '/login');
    }
    await admin.call('/api/auth/logout', 'POST');
    await admin.call('/api/bootstrap', 'GET', undefined, 401);
    db = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.ok(db.audit.some((a) => a.action === 'user.withdraw'));
    assert.equal(db.users.find((u) => u.id === 'u-user1').passwordHash, null);
    console.log(
      `PASS: ${passed} HTTP assertions + field, persistence, sanitization, concurrency and session checks.`,
    );
  } finally {
    await stop();
    await fs.rm(directory, { recursive: true, force: true });
  }
}
if (require.main === module)
  run().catch((error) => {
    console.error(error, output);
    process.exitCode = 1;
  });
module.exports = { start, stop, client };
