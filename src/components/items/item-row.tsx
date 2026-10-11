'use client';

import { Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/money';
import { ownerStyles } from '@/lib/owner-styles';
import type { Item } from '@/lib/types';
import { cn } from '@/lib/utils';
import { OwnerBadge } from './owner-badge';
import { ratioLabel, SplitBar } from './split-bar';

export const ROW_GRID =
  'md:grid md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_3.5rem_2.5rem] md:items-center md:gap-4';

export interface ItemRowProps {
  item: Item;
  currency: string;
  onPaidChange: (paid: boolean) => void;
  onEnabledChange: (enabled: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ItemRow({
  item,
  currency,
  onPaidChange,
  onEnabledChange,
  onEdit,
  onDuplicate,
  onDelete,
}: ItemRowProps) {
  const style = ownerStyles[item.owner];
  const money = (n: number) => formatMoney(n, currency);
  const disabled = !item.isEnabled;

  return (
    <li
      data-testid="item-row"
      data-enabled={item.isEnabled}
      data-paid={item.isPaid}
      className={cn(
        'rounded-lg border border-l-4 bg-card p-3 md:rounded-none md:border-x-0 md:border-l-4 md:border-t-0 md:bg-transparent md:px-3 md:py-2.5',
        style.border,
        ROW_GRID,
        disabled && 'bg-muted opacity-40 grayscale md:bg-muted',
      )}
    >
      <div className="flex items-start gap-3 md:contents">
        <Checkbox
          checked={item.isPaid}
          onCheckedChange={(v) => onPaidChange(v === true)}
          aria-label={`Mark ${item.name} as paid`}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words font-medium" data-testid="item-name">
              {item.name}
            </span>
            {item.isPaid && !disabled && (
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-ink">
                Paid
              </span>
            )}
            {disabled && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                Disabled
              </span>
            )}
          </p>
          {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <RowMenu name={item.name} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 pl-8 md:mt-0 md:contents">
        <div className="space-y-1">
          <OwnerBadge owner={item.owner} />
          {item.owner === 'SHARED' && (
            <div className="flex items-center gap-2">
              <SplitBar groomShareBp={item.groomShareBp} />
              <span className="text-xs tabular-nums text-muted-foreground">
                {ratioLabel(item.groomShareBp)}
              </span>
            </div>
          )}
        </div>

        <div className="text-right md:text-left">
          <p className="font-semibold tabular-nums" data-testid="item-cost">
            {money(item.costMinor)}
          </p>
          {item.owner === 'SHARED' && (
            <p className="text-xs tabular-nums text-muted-foreground">
              <span className={ownerStyles.GROOM.text}>{money(item.groomPortionMinor)}</span>
              {' · '}
              <span className={ownerStyles.BRIDE.text}>{money(item.bridePortionMinor)}</span>
            </p>
          )}
        </div>

        <Switch
          checked={item.isEnabled}
          onCheckedChange={onEnabledChange}
          aria-label={`Include ${item.name} in the budget`}
        />

        <div className="hidden md:block">
          <RowMenu name={item.name} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
    </li>
  );
}

function RowMenu({
  name,
  onEdit,
  onDuplicate,
  onDelete,
}: Pick<ItemRowProps, 'onEdit' | 'onDuplicate' | 'onDelete'> & { name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${name}`}
        className="flex size-9 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 size-4" aria-hidden /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <Copy className="mr-2 size-4" aria-hidden /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 size-4" aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
