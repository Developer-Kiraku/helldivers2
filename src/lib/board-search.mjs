import {koreaDateTimeValue} from './poll-deadline.mjs';

export const emptyBoardFilters = { title:'', author:'', content:'', from:'', to:'' };
const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ko-KR');
export function matchesBoardFilters(post, filters) {
  const date = post.createdAt ? koreaDateTimeValue(post.createdAt).slice(0,10) : String(post.date || '').replaceAll('.','-').slice(0,10);
  return ['title','author','content'].every(key => normalize(post[key]).includes(normalize(filters[key]).trim()))
    && (!filters.from || date >= filters.from) && (!filters.to || Boolean(date) && date <= filters.to);
}
