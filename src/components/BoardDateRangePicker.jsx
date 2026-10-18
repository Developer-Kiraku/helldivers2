'use client';
import {useState} from 'react';
import {Popover} from '@radix-ui/themes';
import {DayPicker,TZDate} from '@daypicker/react';
import {ko} from '@daypicker/react/locale/ko';
import {CalendarDays,ChevronDown,X} from 'lucide-react';
import {Button} from './ui';
import '@daypicker/react/style.css';
import './poll-deadline.css';

const zone='Asia/Seoul';
const day=value=>value?new TZDate(...value.split('-').map((n,i)=>Number(n)-(i===1?1:0)),12,0,0,zone):undefined;
const dateValue=date=>date?`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:'';
const label=value=>value?value.replaceAll('-','. '):'';

export default function BoardDateRangePicker({from,to,onChange}) {
 const [open,setOpen]=useState(false),[range,setRange]=useState(),[month,setMonth]=useState();
 function changeOpen(next) {
  if(next){setRange({from:day(from),to:day(to)});setMonth(day(from)||day(to)||TZDate.tz(zone))}
  setOpen(next);
 }
 function quick(days) {
  const end=TZDate.tz(zone);end.setHours(12,0,0,0);
  const start=new TZDate(end,zone);start.setDate(start.getDate()-(days-1));
  setRange({from:start,to:end});setMonth(start);
 }
 function clear(){onChange({from:'',to:''});setOpen(false)}
 function apply(){onChange({from:dateValue(range?.from),to:dateValue(range?.to)});setOpen(false)}
 const complete=Boolean(range?.from&&range?.to);
 return <div className="board-date-range">
  <Popover.Root open={open} onOpenChange={changeOpen} modal>
   <Popover.Trigger><Button type="button" className="board-date-trigger" aria-label={`작성 날짜 선택: ${from||'시작일 미지정'} ~ ${to||'종료일 미지정'}`}><CalendarDays size={19}/><span><small>시작일</small>{label(from)||'날짜 선택'}</span><span className="board-date-separator">~</span><span><small>종료일</small>{label(to)||'날짜 선택'}</span><ChevronDown size={16}/></Button></Popover.Trigger>
   <Popover.Content className="deadline-popover board-date-popover" align="start" sideOffset={8} collisionPadding={12} aria-label="작성 날짜 범위 선택">
    <header className="deadline-heading"><div><strong>작성 날짜 선택</strong><span>시작일과 종료일을 차례로 선택하세요.</span></div><Popover.Close><Button type="button" className="icon-button" aria-label="날짜 선택 닫기"><X size={18}/></Button></Popover.Close></header>
    <div className="deadline-shortcuts">{[['오늘',1],['최근 7일',7],['최근 30일',30]].map(([text,days])=><Button type="button" key={days} onClick={()=>quick(days)}>{text}</Button>)}</div>
    <DayPicker className="deadline-calendar board-range-calendar" mode="range" locale={ko} timeZone={zone} selected={range} onSelect={setRange} month={month} onMonthChange={setMonth} showOutsideDays fixedWeeks labels={{labelNext:()=> '다음 달',labelPrevious:()=> '이전 달'}}/>
    <p className="deadline-summary" role="status">{range?.from?`${label(dateValue(range.from))} ~ ${range.to?label(dateValue(range.to)):'종료일을 선택하세요'}`:'기간을 지정하지 않으면 전체 날짜에서 검색합니다.'}</p>
    <footer className="deadline-actions"><Button type="button" onClick={clear}>기간 해제</Button><Button type="button" className="primary" disabled={!complete} onClick={apply}>기간 선택 완료</Button></footer>
   </Popover.Content>
  </Popover.Root>
 </div>;
}
