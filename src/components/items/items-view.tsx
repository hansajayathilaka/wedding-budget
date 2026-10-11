'use client';

import { useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/workspace/workspace-context';
import {
  createItem,
  deleteItem,
  duplicateItem,
  nextSortOrder,
  setItemEnabled,
  setItemPaid,
  updateItem,
} from '@/data/items';
import { summarize } from '@/lib/budget';
import {
  filterItems,
  filtersToSearch,
  parseFilters,
  type ItemFilters as Filters,
} from '@/lib/filters';
import { formatMoney } from '@/lib/money';
import { notifyOnError } from '@/lib/notify';
import type { Item } from '@/lib/types';
import { DeleteItemDialog } from './delete-item-dialog';
import { ItemFilters } from './item-filters';
import { ItemFormSheet } from './item-form-sheet';
import { ItemRow, ROW_GRID } from './item-row';

export function ItemsView() {
  const { wedding, items, itemsLoading, itemsError } = useWorkspace();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Local state is the source of truth (instant, no stale reads while typing); the URL mirrors it
  // so filters survive reloads and can be linked to.
  const [filters, setFiltersState] = useState(() => parseFilters(searchParams));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const visible = useMemo(() => filterItems(items, filters), [items, filters]);
  const totals = useMemo(() => summarize(visible), [visible]);
  const usedCategories = useMemo(
    () => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))],
    [items],
  );
  const money = (n: number) => formatMoney(n, wedding.currency);
  const id = wedding.id;

  function setFilters(next: Filters) {
    setFiltersState(next);
    window.history.replaceState(null, '', `${pathname}${filtersToSearch(next)}`);
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  if (itemsError) {
    return (
      <p role="alert" className="py-12 text-center text-sm text-destructive">
        Could not load the items. Check your connection and reload.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ItemFilters filters={filters} onChange={setFilters} />
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="size-4" aria-hidden /> Add item
        </Button>
      </div>

      {itemsLoading ? (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {items.length === 0 ? (
            <>
              <p className="mb-3">No budget items yet.</p>
              <Button onClick={openAdd}>Add your first item</Button>
            </>
          ) : (
            'No items match these filters.'
          )}
        </div>
      ) : (
        <div>
          <div
            className={`hidden border-b px-3 pb-2 pl-[calc(0.75rem+4px)] text-xs font-medium uppercase tracking-wide text-muted-foreground ${ROW_GRID}`}
            aria-hidden
          >
            <span />
            <span>Item</span>
            <span>Paid by</span>
            <span>Cost</span>
            <span>On</span>
            <span />
          </div>
          <ul className="space-y-2 md:space-y-0" aria-label="Budget items">
            {visible.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                currency={wedding.currency}
                onPaidChange={(paid) => notifyOnError(setItemPaid(id, item.id, paid))}
                onEnabledChange={(on) => notifyOnError(setItemEnabled(id, item.id, on))}
                onEdit={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
                onDuplicate={() => notifyOnError(duplicateItem(id, item))}
                onDelete={() => setDeleting(item)}
              />
            ))}
          </ul>
        </div>
      )}

      <footer
        className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur"
        data-testid="totals-footer"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            {totals.counts.enabled} item{totals.counts.enabled === 1 ? '' : 's'} counted
            {totals.counts.disabled > 0 && ` · ${totals.counts.disabled} disabled`}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-0.5 tabular-nums">
            <span>
              Total <strong data-testid="footer-total">{money(totals.total)}</strong>
            </span>
            <span className="text-success-ink">
              Paid <strong data-testid="footer-paid">{money(totals.paid)}</strong>
            </span>
            <span>
              Left <strong data-testid="footer-remaining">{money(totals.remaining)}</strong>
            </span>
          </span>
        </div>
      </footer>

      <ItemFormSheet
        open={formOpen}
        item={editing}
        currency={wedding.currency}
        defaultGroomShareBp={wedding.defaultGroomShareBp}
        groomName={wedding.groomName}
        brideName={wedding.brideName}
        usedCategories={usedCategories}
        onOpenChange={setFormOpen}
        onSubmit={(input, existing) => {
          if (existing) {
            notifyOnError(updateItem(id, existing.id, { ...input, sortOrder: existing.sortOrder }));
          } else {
            notifyOnError(createItem(id, { ...input, sortOrder: nextSortOrder() }));
          }
        }}
      />
      <DeleteItemDialog
        item={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={(item) => {
          setDeleting(null);
          notifyOnError(deleteItem(id, item.id), 'The item could not be deleted.');
        }}
      />
    </div>
  );
}
