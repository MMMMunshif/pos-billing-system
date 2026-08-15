import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(
    amount || 0
  );

export const formatDate = (date) => {
  if (!date) return '-';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return format(d, 'dd MMM yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return format(d, 'dd MMM yyyy HH:mm');
};

export const toDateInputValue = (date = new Date()) => format(new Date(date), 'yyyy-MM-dd');

export const parseDateInput = (value) => {
  const d = new Date(value);
  d.setHours(12, 0, 0, 0);
  return d;
};

export const getTodayRange = () => {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
};

export const getMonthRange = (date = new Date()) => ({
  start: startOfMonth(date),
  end: endOfMonth(date),
});

export const isDateInRange = (date, start, end) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return isWithinInterval(d, { start, end });
};

/** True when sale/record falls on the same calendar day as `reference` (local time). */
export const isToday = (date, reference = new Date()) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return format(d, 'yyyy-MM-dd') === format(reference, 'yyyy-MM-dd');
};

export const formatTodayLabel = (date = new Date()) => format(date, 'EEEE, dd MMM yyyy');

export const calcBalance = (total, paid) => Math.max(0, (total || 0) - (paid || 0));
