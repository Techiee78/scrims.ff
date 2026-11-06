export const coins = (value) => Number(value || 0).toLocaleString('en-IN');

// Every match time is shown in Indian Standard Time, whatever the device zone.
export const IST_ZONE = 'Asia/Kolkata';

const istDay = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const istShortDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST_ZONE, day: 'numeric', month: 'short' }).format(date);

const istClock = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

export function matchTime(value) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  const now = new Date();
  const dayKey = istDay(date);
  const day =
    dayKey === istDay(now)
      ? 'Today'
      : dayKey === istDay(new Date(now.getTime() + 86400000))
        ? 'Tomorrow'
        : istShortDate(date);
  return `${day} · ${istClock(date)} IST`;
}

const IST_OFFSET_MINUTES = 330;

// "YYYY-MM-DDTHH:mm" typed by the admin is Indian Standard Time, whatever
// the browser zone is -> stored as a UTC ISO string.
export function istInputToIso(value) {
  if (!value) return undefined;
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MINUTES * 60000;
  return new Date(utcMs).toISOString();
}

// Stored UTC value -> "YYYY-MM-DDTHH:mm" in IST, for a datetime-local input.
export function isoToIstInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function startsIn(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Starting now';
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Starts in ${days}d ${hours % 24}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes % 60}m`;
  return `Starts in ${minutes}m`;
}

export const initials = (user) => {
  const source = user?.full_name || user?.email || '';
  return source.charAt(0).toUpperCase() || 'P';
};