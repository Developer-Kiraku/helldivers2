// Values exchanged with the editor are always Korea time, independent of the browser zone.
export function koreaDateTimeValue(instant) {
  const date = new Date(instant);
  return Number.isFinite(date.getTime()) ? new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16) : '';
}

export function koreaDateTimeIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+09:00`);
  return Number.isFinite(date.getTime()) && koreaDateTimeValue(date) === value ? date.toISOString() : null;
}
