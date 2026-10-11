'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { formatMoney } from '@/lib/money';
import { Countdown } from './countdown';
import { CategoryBreakdown } from './category-breakdown';
import { PartyBreakdown } from './party-breakdown';
import { StatCard } from './stat-card';

export function Dashboard() {
  const { wedding, summary, itemsLoading, itemsError } = useWorkspace();
  const money = (n: number) => formatMoney(n, wedding.currency);
  const items = `/w/${wedding.id}/items`;
  const percent = Math.round(summary.percentPaid * 100);
  const target = wedding.targetBudgetMinor;

  if (itemsError) {
    return (
      <p role="alert" className="py-12 text-center text-sm text-destructive">
        Could not load the budget. Check your connection and reload.
      </p>
    );
  }

  return (
    <div className="space-y-4" aria-busy={itemsLoading}>
      <Countdown date={wedding.weddingDate} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total budget" value={money(summary.total)} testId="stat-total">
          {target != null && (
            <p className="text-xs text-muted-foreground">
              {summary.total > target
                ? `${money(summary.total - target)} over target`
                : `${money(target - summary.total)} under target`}
            </p>
          )}
        </StatCard>
        <StatCard
          title="Paid"
          value={money(summary.paid)}
          className="text-emerald-600 dark:text-emerald-400"
          testId="stat-paid"
        />
        <StatCard title="Remaining" value={money(summary.remaining)} testId="stat-remaining" />
        <StatCard title="Paid so far" value={`${percent}%`} testId="stat-percent">
          <Progress value={summary.percentPaid} label="Percent paid" />
        </StatCard>
      </div>

      <PartyBreakdown
        summary={summary}
        groomName={wedding.groomName}
        brideName={wedding.brideName}
        currency={wedding.currency}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryBreakdown summary={summary} currency={wedding.currency} />
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-3 gap-2 text-center">
              <CountLink
                href={items}
                label="Items"
                value={summary.counts.enabled}
                testId="count-all"
              />
              <CountLink
                href={`${items}?status=unpaid`}
                label="Unpaid"
                value={summary.counts.unpaid}
                testId="count-unpaid"
              />
              <CountLink
                href={`${items}?status=disabled`}
                label="Disabled"
                value={summary.counts.disabled}
                testId="count-disabled"
              />
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Disabled items are left out of every total.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CountLink({
  href,
  label,
  value,
  testId,
}: {
  href: string;
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <li>
      <Link
        href={href}
        data-testid={testId}
        className="block rounded-md bg-muted/60 p-3 transition-colors hover:bg-muted"
      >
        <span className="block text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </Link>
    </li>
  );
}
