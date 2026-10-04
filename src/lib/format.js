import { format, isToday, isTomorrow } from 'date-fns';

export const coins = (value) => Number(value || 0).toLocaleString('en-IN');

export function matchTime(value) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  const day = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'd MMM');
  return `${day} · ${format(date, 'h:mm a')}`;
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