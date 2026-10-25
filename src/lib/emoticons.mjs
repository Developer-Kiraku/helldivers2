const captions = [
  '안녕!',
  '고마워!',
  '최고!',
  'ㅋㅋㅋ',
  '엉엉',
  '화났다!',
  '헉!',
  '미안…',
  '잘 자',
  '포옹!',
  '히히',
  '삐짐',
  '배고파',
  '들켰다!',
  '덜덜',
  '인간아…',
  '과열됨',
  '출근 싫어',
  '감시 중',
  '뭐라고?',
  '민주주의!',
  '증원 요청!',
  '보급 좀!',
  '스팀 한 방!',
  '500kg 간다!',
  '팀킬 미안!',
  '다이빙!',
  '샘플은 공유!',
  '탈출 대기!',
  '나만 남았네',
  '한 판만 더',
  '퇴근 완료!',
  '진리부 신고',
  '이게 왜 살아?',
  '응, 안 맞아',
  '스텔스 중',
  '내 뒤에 있어',
  '교통사고!',
  '눈 마주침',
  '우린 친구지?',
  '최세트 · 햄버거가 목에 걸렸어 ㅠㅠ',
  '희두 · 엉덩이 어디 있어?',
  '이오 · 소중한 내 알 ㅠㅠ',
  'mouse · 또 회식이야 ㅠㅠ',
  '브 · 어휴 내 엉덩이',
  '최부장 · 탐스럽다',
  '오소리 · 니하오~',
  'woong · 부끄러운 요리',
  '라미아 · 내 개소리 재료들',
  '브 · 아군킬이 부족하군',
];
export const emoticonGroups = ['기본 감정', '적 캐릭터', '강하 상황', '공감 밈', '대원 밈'];
export const emoticons = captions.map((label, index) => {
  const id = String(index + 1).padStart(2, '0');
  return {
    id,
    label,
    group: Math.floor(index / 10),
    src: `/emoticons/${id}.webp`,
    token: `:hd${id}:`,
  };
});
export const emoticonForId = (id) => emoticons.find((item) => item.id === id);
export const emoticonForSrc = (src) => emoticons.find((item) => item.src === src);
export function emoticonParts(value) {
  return String(value || '')
    .split(/(:hd\d{2}:)/g)
    .filter(Boolean)
    .map((text) => ({
      text,
      emoticon: /^:hd\d{2}:$/.test(text) ? emoticonForId(text.slice(3, 5)) : null,
    }));
}
