'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ItemFilters as Filters, StatusFilter } from '@/lib/filters';
import { ownerStyles } from '@/lib/owner-styles';
import type { Owner } from '@/lib/types';
import { cn } from '@/lib/utils';

const OWNER_CHIPS: Array<{ value: Owner | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'GROOM', label: 'Groom' },
  { value: 'BRIDE', label: 'Bride' },
  { value: 'SHARED', label: 'Shared' },
];

const STATUS_CHIPS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'disabled', label: 'Disabled' },
];

function Chip({
  active,
  activeClass,
  children,
  onClick,
}: {
  active: boolean;
  activeClass?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? (activeClass ?? 'border-transparent bg-primary text-primary-foreground')
          : 'bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}

export function ItemFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search items"
          aria-label="Search items"
          className="pl-9"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Owner">
          {OWNER_CHIPS.map((c) => (
            <Chip
              key={c.value}
              active={filters.owner === c.value}
              activeClass={
                c.value === 'ALL'
                  ? undefined
                  : `border-transparent ${ownerStyles[c.value].selected}`
              }
              onClick={() => onChange({ ...filters, owner: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {STATUS_CHIPS.map((c) => (
            <Chip
              key={c.value}
              active={filters.status === c.value}
              onClick={() => onChange({ ...filters, status: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={filters.showDisabled}
            onCheckedChange={(v) => onChange({ ...filters, showDisabled: v })}
            aria-label="Show disabled"
          />
          Show disabled
        </label>
      </div>
    </div>
  );
}
