export const gameResultLabels = {
  'sliding-puzzle': '슬라이딩 퍼즐',
  dice: '민주주의 주사위',
  rps: '가위바위보',
  'rps-hand': '손 강화',
  stratagem: '스트라타젬 히어로',
};
export const validGameShareCode = (code) =>
  typeof code === 'string' && /^[A-Za-z0-9_-]{24}$/.test(code);
export const gameSharePath = (code) => `/game-results/${code}`;
export function gameShareImagePath(path, game, download = false) {
  const query = new URLSearchParams();
  if (game === 'rps-hand') query.set('v', 'hand-art-2');
  if (download) query.set('download', '1');
  return `${path}/image${query.size ? `?${query}` : ''}`;
}
export function gameResultMessage(result, url, imageUrl) {
  const link = { mobileWebUrl: url, webUrl: url };
  const title = `${result.nickname} · ${result.gameLabel}`;
  const buttonTitle = result.game === 'rps-hand' ? '손 강화 보기' : '게임 결과 보기';
  if (!imageUrl)
    return {
      objectType: 'text',
      text: `${title}\n${result.headline}\n${result.summary}`.slice(0, 200),
      link,
      buttonTitle,
    };
  return {
    objectType: 'feed',
    content: {
      title: title.slice(0, 100),
      description: `${result.headline} · ${result.summary}`.slice(0, 200),
      imageUrl,
      imageWidth: 1200,
      imageHeight: 630,
      link,
    },
    buttons: [{ title: buttonTitle, link }],
  };
}
