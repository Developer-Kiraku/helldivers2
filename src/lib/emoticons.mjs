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
];
export const emoticonGroups = ['기본 감정', '적 캐릭터', '강하 상황', '공감 밈'];
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
    .split(/(:hd(?:0[1-9]|[1-3]\d|40):)/g)
    .filter(Boolean)
    .map((text) => ({
      text,
      emoticon: /^:hd\d{2}:$/.test(text) ? emoticonForId(text.slice(3, 5)) : null,
    }));
}
