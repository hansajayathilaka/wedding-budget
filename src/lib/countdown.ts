import { differenceInCalendarDays, isSameDay } from 'date-fns';

export type Countdown =
  | { phase: 'before'; days: number; hours: number; minutes: number; seconds: number }
  | { phase: 'today' }
  | { phase: 'after'; daysAgo: number };

/** Time until the wedding, "Today" on the day itself, or days since once it has passed. */
export function getCountdown(target: Date, now: Date): Countdown {
  if (isSameDay(target, now)) return { phase: 'today' };
  const ms = target.getTime() - now.getTime();
  if (ms < 0) return { phase: 'after', daysAgo: differenceInCalendarDays(now, target) };
  const totalSeconds = Math.floor(ms / 1000);
  return {
    phase: 'before',
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Short label for cards: "124 days to go", "Today!", "Married 12 days ago". */
export function countdownLabel(target: Date, now: Date): string {
  const c = getCountdown(target, now);
  if (c.phase === 'today') return 'Today! 🎉';
  if (c.phase === 'after') return `Married ${plural(c.daysAgo, 'day')} ago`;
  const days = differenceInCalendarDays(target, now);
  return `${plural(days, 'day')} to go`;
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** Date <-> the string an <input type="datetime-local"> uses (local time, minute precision). */
export function toDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeInput(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
