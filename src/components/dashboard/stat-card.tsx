import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  title,
  value,
  children,
  className,
  testId,
}: {
  title: string;
  value: string;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p
          className={cn('text-xl font-semibold tabular-nums sm:text-2xl', className)}
          data-testid={testId}
        >
          {value}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
