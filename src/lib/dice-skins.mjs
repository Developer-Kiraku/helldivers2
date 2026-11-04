export const diceSkins = [
  { id: 'helldiver', label: '헬다이버', code: 'A', description: '흑철 · 노란 경고선' },
  { id: 'super-earth', label: '슈퍼지구', code: 'B', description: '네이비 · 골드 장식' },
  { id: 'eagle', label: '이글', code: 'C', description: '백색 장갑 · 레드 스트라이프' },
  { id: 'automaton', label: '오토마톤', code: 'D', description: '강철 · 붉은 발광 눈금' },
];
export const isDiceSkin = (value) => diceSkins.some((skin) => skin.id === value);
export const diceSkin = (value) => diceSkins.find((skin) => skin.id === value) || diceSkins[0];
