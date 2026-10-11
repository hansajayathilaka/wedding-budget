import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetSummary } from '@/lib/budget';
import { formatMoney } from '@/lib/money';
import { ownerStyles } from '@/lib/owner-styles';
import { cn } from '@/lib/utils';

function Column({
  owner,
  name,
  party,
  currency,
}: {
  owner: 'GROOM' | 'BRIDE';
  name: string;
  party: BudgetSummary['groom'];
  currency: string;
}) {
  const style = ownerStyles[owner];
  return (
    <div
      className={cn('space-y-2 rounded-md border-l-4 bg-muted/50 p-3', style.border)}
      data-testid={`party-${owner.toLowerCase()}`}
    >
      <p className={cn('truncate text-sm font-medium', style.text)}>{name}</p>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium tabular-nums">{formatMoney(party.total, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="tabular-nums">{formatMoney(party.paid, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Remaining</dt>
          <dd className="tabular-nums">{formatMoney(party.remaining, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function PartyBreakdown({
  summary,
  groomName,
  brideName,
  currency,
}: {
  summary: BudgetSummary;
  groomName: string;
  brideName: string;
  currency: string;
}) {
  const groomPct = summary.total === 0 ? 50 : (summary.groom.total / summary.total) * 100;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who pays what</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="img"
          aria-label={`${groomName} ${Math.round(groomPct)}%, ${brideName} ${Math.round(100 - groomPct)}%`}
          className="flex h-3 overflow-hidden rounded-full bg-muted"
        >
          {summary.total > 0 && (
            <>
              <div className={ownerStyles.GROOM.bar} style={{ width: `${groomPct}%` }} />
              <div className={cn(ownerStyles.BRIDE.bar, 'flex-1')} />
            </>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Column owner="GROOM" name={groomName} party={summary.groom} currency={currency} />
          <Column owner="BRIDE" name={brideName} party={summary.bride} currency={currency} />
        </div>
      </CardContent>
    </Card>
  );
}
