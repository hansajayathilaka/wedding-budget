'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getCountdown } from '@/lib/countdown';

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-lg bg-white/15 px-3 py-2">
      <span className="text-3xl font-semibold tabular-nums sm:text-4xl">
        {String(value).padStart(label === 'days' ? 1 : 2, '0')}
      </span>
      <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

/**
 * Renders a placeholder on the server and first client render, then fills in on mount and ticks
 * every second, so there is no hydration mismatch from `new Date()`.
 */
export function Countdown({ date }: { date: Date }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const c = now ? getCountdown(date, now) : null;

  return (
    <section
      aria-label="Countdown to the wedding"
      className="rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 p-5 text-white sm:p-7"
    >
      <p className="text-sm opacity-90">{format(date, 'EEEE, d MMMM yyyy · p')}</p>
      <div className="mt-3 min-h-[4.5rem]" data-testid="countdown" aria-live="off">
        {!c ? null : c.phase === 'today' ? (
          <p className="text-3xl font-semibold">Today! 🎉</p>
        ) : c.phase === 'after' ? (
          <p className="text-3xl font-semibold">
            Married {c.daysAgo} {c.daysAgo === 1 ? 'day' : 'days'} ago
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Unit value={c.days} label="days" />
            <Unit value={c.hours} label="hours" />
            <Unit value={c.minutes} label="minutes" />
            <Unit value={c.seconds} label="seconds" />
          </div>
        )}
      </div>
    </section>
  );
}
