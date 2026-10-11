'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getWeddingCardStats, type WeddingCardStats } from '@/data/weddings';
import type { WeddingWithProfiles } from '@/data/converters';
import { countdownLabel } from '@/lib/countdown';
import { formatMoney } from '@/lib/money';

export function WeddingCard({ wedding }: { wedding: WeddingWithProfiles }) {
  const router = useRouter();
  const [stats, setStats] = useState<WeddingCardStats | null>(null);
  // computed after mount so server/client markup never disagree
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    let cancelled = false;
    getWeddingCardStats(wedding.id)
      .then((s) => !cancelled && setStats(s))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [wedding.id]);

  const percent = stats && stats.total > 0 ? stats.paid / stats.total : 0;

  return (
    <button
      type="button"
      // replace(): the list page must not stay in history (D1)
      onClick={() => router.replace(`/w/${wedding.id}`)}
      className="group text-left outline-none"
      data-testid="wedding-card"
    >
      <Card className="h-full space-y-4 p-5 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-tight">{wedding.name}</h2>
          <p className="text-sm text-muted-foreground">
            {wedding.groomName} <span aria-hidden>&</span>
            <span className="sr-only">and</span> {wedding.brideName}
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden />
            {format(wedding.weddingDate, 'd MMM yyyy')}
          </span>
          <span className="font-medium">
            {now ? countdownLabel(wedding.weddingDate, now) : ' '}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total budget</span>
            <span className="font-semibold tabular-nums">
              {stats ? formatMoney(stats.total, wedding.currency) : '…'}
            </span>
          </div>
          <Progress value={percent} label="Paid" />
          <p className="text-xs text-muted-foreground">
            {stats ? `${Math.round(percent * 100)}% paid` : ' '}
          </p>
        </div>
      </Card>
    </button>
  );
}
