export const navigationGroups = [
  {
    id: 'community',
    label: '커뮤니티',
    icon: 'talk',
    items: [
      { href: '/boards/notice', label: '공지사항', icon: 'flag' },
      { href: '/boards/talk', label: '헬다이버톡', icon: 'talk' },
      { href: '/boards/helstagram', label: '헬스타그램', icon: 'camera' },
      { href: '/boards/qna', label: '질문상담실', icon: 'question' },
      { href: '/boards/report', label: '진리부 신고', icon: 'shield' },
    ],
  },
  {
    id: 'helldivers',
    label: '헬다이버즈',
    icon: 'crosshair',
    items: [
      { href: '/boards/guide', label: '공략브리핑', icon: 'target' },
      { href: '/boards/loadout', label: '로드아웃', icon: 'crosshair' },
      { href: '/boards/tierlist', label: '티어 메이커', icon: 'poll' },
      { href: '/warbonds', label: '전쟁 채권 사전', icon: 'library' },
    ],
  },
  {
    id: 'other',
    label: '게임',
    icon: 'puzzle',
    items: [
      { href: '/games/sliding-puzzle', label: '슬라이딩 퍼즐', icon: 'puzzle' },
      { href: '/games/dice', label: '민주주의 주사위', icon: 'dice' },
      { href: '/games/rps', label: '가위바위보', icon: 'rps' },
      { href: '/games/stratagem', label: '스트라타젬 챌린지', icon: 'stratagem' },
    ],
  },
];
export const operatorNavigation = [
  { href: '/admin/users', label: '회원 리스트', icon: 'users' },
  { href: '/admin/approvals', label: '요청 승인 목록', icon: 'approvals' },
  { href: '/admin/logs', label: '로그 확인', icon: 'logs' },
  { href: '/admin/settings', label: 'SETTING', icon: 'settings', operator: true },
];
export const navigationActive = (path, href) => path === href || path.startsWith(href + '/');
