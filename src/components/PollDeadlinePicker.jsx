'use client';
import { useEffect, useState } from 'react';
import { Popover } from '@radix-ui/themes';
import { DayPicker, TZDate } from '@daypicker/react';
import { ko } from '@daypicker/react/locale/ko';
import { CalendarDays, ChevronDown, Clock3, X } from 'lucide-react';
import { Button, Label, Select } from './ui';
import { koreaDateTimeIso, koreaDateTimeValue } from '@/lib/poll-deadline.mjs';
import '@daypicker/react/style.css';
import './poll-deadline.scss';

const zone = 'Asia/Seoul';
const pad = (value) => String(value).padStart(2, '0');
const hours = Array.from({ length: 24 }, (_, i) => pad(i));
const minutes = Array.from({ length: 60 }, (_, i) => pad(i));
const formatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: zone,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function calendarDay(value) {
  if (!koreaDateTimeIso(value)) return undefined;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new TZDate(year, month - 1, day, 12, 0, 0, zone);
}
const describe = (value) => {
  const iso = koreaDateTimeIso(value);
  return iso ? formatter.format(new Date(iso)) : '';
};

export default function PollDeadlinePicker({ id = 'poll-deadline', value = '', onChange }) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(''),
    [month, setMonth] = useState(),
    [clock, setClock] = useState(Date.now()),
    [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [open]);
  const selected = calendarDay(draft),
    today = TZDate.tz(zone);
  today.setHours(0, 0, 0, 0);
  const [hour = '00', minute = '00'] = (draft.split('T')[1] || '').split(':');
  const iso = koreaDateTimeIso(draft),
    valid = Boolean(iso && Date.parse(iso) > clock);
  function changeOpen(next) {
    if (next) {
      const initial = value || koreaDateTimeValue(Date.now() + 3600000);
      setDraft(initial);
      setMonth(calendarDay(initial));
      setClock(Date.now());
      setError('');
    }
    setOpen(next);
  }
  function pick(day) {
    if (day) {
      setDraft(
        `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${hour}:${minute}`,
      );
      setError('');
    }
  }
  function time(part, next) {
    const date = draft.slice(0, 10);
    setDraft(`${date}T${part === 'hour' ? next : hour}:${part === 'minute' ? next : minute}`);
    setClock(Date.now());
    setError('');
  }
  function quick(amount) {
    const next = koreaDateTimeValue(Date.now() + amount);
    setDraft(next);
    setMonth(calendarDay(next));
    setClock(Date.now());
    setError('');
  }
  function clear() {
    onChange('');
    setOpen(false);
  }
  function apply() {
    if (!iso || Date.parse(iso) <= Date.now()) {
      setClock(Date.now());
      setError('현재보다 이후의 날짜와 시간을 선택해주세요.');
      return;
    }
    onChange(draft);
    setOpen(false);
  }
  return (
    <div className="deadline-picker">
      <div className="deadline-field">
        <Popover.Root open={open} onOpenChange={changeOpen} modal>
          <Popover.Trigger>
            <Button
              type="button"
              id={id}
              className={`deadline-trigger ${value ? '' : 'is-empty'}`}
              aria-describedby={`${id}-hint`}
            >
              <CalendarDays size={19} />
              <span>
                {value ? describe(value) : '날짜와 시간을 선택하세요'}
                <small>{value ? '한국 시간 · KST' : '마감 없이 진행하려면 비워두세요'}</small>
              </span>
              <ChevronDown size={17} />
            </Button>
          </Popover.Trigger>
          <Popover.Content
            className="deadline-popover"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            aria-label="투표 마감 일시 선택"
          >
            <header className="deadline-heading">
              <div>
                <strong>마감 일시 선택</strong>
                <span>한국 시간 · KST</span>
              </div>
              <Popover.Close>
                <Button type="button" className="icon-button" aria-label="마감 일시 선택 닫기">
                  <X size={18} />
                </Button>
              </Popover.Close>
            </header>
            <div className="deadline-shortcuts">
              {[
                ['1시간 후', 3600000],
                ['내일', 86400000],
                ['1주 후', 604800000],
              ].map(([label, amount]) => (
                <Button type="button" key={label} onClick={() => quick(amount)}>
                  {label}
                </Button>
              ))}
            </div>
            <DayPicker
              className="deadline-calendar"
              mode="single"
              required
              locale={ko}
              timeZone={zone}
              selected={selected}
              onSelect={pick}
              month={month}
              onMonthChange={setMonth}
              disabled={{ before: today }}
              startMonth={today}
              showOutsideDays
              fixedWeeks
              labels={{ labelNext: () => '다음 달', labelPrevious: () => '이전 달' }}
            />
            <div className="deadline-time">
              <Label htmlFor={`${id}-hour`}>
                <Clock3 size={17} />
                마감 시간
              </Label>
              <div>
                <Select
                  id={`${id}-hour`}
                  aria-label="마감 시간 시"
                  value={hour}
                  onChange={(e) => time('hour', e.target.value)}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </Select>
                <span>:</span>
                <Select
                  id={`${id}-minute`}
                  aria-label="마감 시간 분"
                  value={minute}
                  onChange={(e) => time('minute', e.target.value)}
                >
                  {minutes.map((m) => (
                    <option key={m} value={m}>
                      {m}분
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className={`deadline-summary ${valid ? '' : 'is-invalid'}`} role="status">
              {error || (!valid ? '현재보다 이후의 시간으로 지정해주세요.' : describe(draft))}
            </p>
            <footer className="deadline-actions">
              <Button type="button" className="button secondary" onClick={clear}>
                마감 없음
              </Button>
              <Button type="button" className="button primary" disabled={!valid} onClick={apply}>
                선택 완료
              </Button>
            </footer>
          </Popover.Content>
        </Popover.Root>
        {value && (
          <Button
            type="button"
            className="icon-button deadline-clear"
            aria-label="마감 일시 지우기"
            onClick={clear}
          >
            <X size={17} />
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="field-hint">
        설정한 한국 시간에 자동으로 투표가 마감됩니다.
      </p>
    </div>
  );
}
