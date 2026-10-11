import type { Owner } from '@/lib/types';
import { ownerStyles } from '@/lib/owner-styles';
import { cn } from '@/lib/utils';

export function OwnerBadge({ owner, className }: { owner: Owner; className?: string }) {
  const style = ownerStyles[owner];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        style.badge,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
