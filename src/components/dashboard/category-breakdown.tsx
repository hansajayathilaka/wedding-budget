import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetSummary } from '@/lib/budget';
import { formatMoney } from '@/lib/money';

const TOP = 8;

export function CategoryBreakdown({
  summary,
  currency,
}: {
  summary: BudgetSummary;
  currency: string;
}) {
  const rows = summary.byCategory.slice(0, TOP);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card>
      <CardHeader>
        <CardTitle>By category</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.category} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{row.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatMoney(row.total, currency)}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                    style={{ width: `${(row.total / max) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-success"
                    style={{ width: `${(row.paid / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {summary.byCategory.length > TOP && (
          <p className="mt-3 text-xs text-muted-foreground">
            + {summary.byCategory.length - TOP} more categories
          </p>
        )}
      </CardContent>
    </Card>
  );
}
