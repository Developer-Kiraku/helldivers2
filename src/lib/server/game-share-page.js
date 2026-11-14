import { readStore, operationalCollections } from './store';
import { findPublicGameShare } from './game-shares';
import { validGameShareCode } from '../game-results.mjs';
export const getGameShare = (code) =>
  validGameShareCode(code)
    ? readStore((db) => findPublicGameShare(db, code), {
        collections: [...operationalCollections, 'gameShares'],
      })
    : Promise.resolve(null);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
export function gameShareHtml(share, origin) {
  const { result, path } = share;
  const url = new URL(path, origin).href;
  const image = `${url}/image`;
  const title = `${result.nickname} · ${result.gameLabel}`;
  const description = `${result.headline} · ${result.summary}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(url)}"><meta property="og:image" content="${escape(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(image)}"><style>
@font-face{font-family:Pretendard;src:url('/fonts/PretendardVariable.woff2')}*{box-sizing:border-box}body{margin:0;background:#171d1b;color:#edf2ea;font-family:Pretendard,system-ui,sans-serif;line-height:1.6}main{width:min(920px,100%);margin:0 auto;padding:48px 20px}header{display:flex;align-items:center;gap:16px;margin-bottom:24px}header img{width:132px;filter:brightness(0) invert(1)}header span{font-size:12px;letter-spacing:2px;color:#b5beb4}.result{border:1px solid #414e44;background:#232e27;border-radius:20px;overflow:hidden}.result>img{display:block;width:100%;height:auto}.details{padding:24px}h1{font-size:24px;margin:0 0 8px}p{margin:6px 0;color:#b5beb4}.stats{display:grid;grid-template-columns:repeat(${result.stats.length},minmax(0,1fr));gap:12px;margin:24px 0}.stats div{padding:14px;background:#1a231e;border-radius:10px}.stats dt{font-size:12px;color:#b5beb4}.stats dd{margin:6px 0 0;font-weight:600;overflow-wrap:anywhere}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#f5d956;text-decoration:none}nav a{display:inline-flex;justify-content:center;padding:12px 20px;border:1px solid #556046;border-radius:9px;flex:1}nav a:first-child{background:#f5d956;color:#1a231e;font-weight:600}footer{font-size:12px;margin-top:18px;color:#a0aba0}@media(max-width:520px){main{padding:24px 12px}.details{padding:18px}h1{font-size:20px}.stats{gap:6px}.stats div{padding:10px 8px}.stats dd{font-size:14px}header span{font-size:10px}}
</style></head><body><main><header><a href="/"><img src="/images/helldivers-logo.png" alt="HELLDIVERS 2 COMMUNITY"></a><span>MISSION REPORT</span></header><article class="result"><img src="${escape(image)}" width="1200" height="630" alt="${escape(description)}"><div class="details"><h1>${escape(title)}</h1><p>${escape(description)}</p><dl class="stats">${result.stats.map(({ label, value }) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl><nav><a href="/games/${escape(result.game === 'rps-hand' ? 'rps' : result.game)}">나도 도전하기</a><a href="${escape(image)}?download=1" download="game-result.png">결과 이미지 저장</a></nav></div></article><footer>대원이 직접 공유한 게임 결과입니다. ${escape(new Date(result.completedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} · 한국 시간</footer></main></body></html>`;
}
