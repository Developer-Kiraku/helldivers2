const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

module.exports = async function ({ guest, member }) {
  const { warbonds } = await import('../src/lib/warbonds.mjs');
  await guest.call('/warbonds', 'GET', undefined, 307);
  await guest.call(`/warbonds/${warbonds[0].slug}`, 'GET', undefined, 307);
  const list = new JSDOM((await member.call('/warbonds')).data).window.document;
  assert.equal(list.querySelectorAll('.warbond-list-item').length, warbonds.length);
  assert.equal(list.querySelector('main h1').textContent, '전쟁 채권 사전');
  let pages = 0;
  for (const warbond of warbonds) {
    for (const page of warbond.pages) {
      const doc = new JSDOM(
        (await member.call(`/warbonds/${warbond.slug}?page=${page.number}`)).data,
      ).window.document;
      assert.equal(doc.querySelector('main h1').textContent, warbond.label);
      assert.equal(doc.querySelectorAll('.warbond-reward').length, page.items.length);
      assert.deepEqual(
        [...doc.querySelectorAll('.warbond-reward h3')].map((node) => node.textContent),
        page.items.map((item) => item.label),
      );
      assert.equal(
        doc.querySelector('.warbond-pages [aria-current=page]').getAttribute('href'),
        `/warbonds/${warbond.slug}?page=${page.number}`,
      );
      assert.equal(doc.querySelector('main [contenteditable], main textarea'), null);
      pages++;
      doc.defaultView.close();
    }
  }
  const fallback = new JSDOM((await member.call(`/warbonds/${warbonds[0].slug}?page=999`)).data)
    .window.document;
  assert.match(fallback.querySelector('#warbond-page-title').textContent, /^1페이지/);
  await member.call('/warbonds/unknown-warbond', 'GET', undefined, 404);
  console.log(
    `PASS: ${warbonds.length} read-only warbonds, ${pages} rendered reward pages, invalid-page fallback and access guards`,
  );
};
