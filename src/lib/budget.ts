import type { Item, ItemInput, Owner } from './types';

export interface Portion {
  groom: number;
  bride: number;
}

export const BP_TOTAL = 10000;

type SplitInput = Pick<ItemInput, 'owner' | 'groomShareBp' | 'costMinor'>;

/** Who pays how much of an item. `groom + bride === costMinor` always. */
export function splitItem(item: SplitInput): Portion {
  switch (item.owner as Owner) {
    case 'GROOM':
      return { groom: item.costMinor, bride: 0 };
    case 'BRIDE':
      return { groom: 0, bride: item.costMinor };
    case 'SHARED': {
      const groom = Math.round((item.costMinor * item.groomShareBp) / BP_TOTAL);
      return { groom, bride: item.costMinor - groom };
    }
  }
}

/** Adds the derived portions that get stored alongside the item. */
export function withPortions<T extends SplitInput>(
  item: T,
): T & { groomPortionMinor: number; bridePortionMinor: number } {
  const { groom, bride } = splitItem(item);
  return { ...item, groomPortionMinor: groom, bridePortionMinor: bride };
}

export interface PartySummary {
  total: number;
  paid: number;
  remaining: number;
}

export interface CategorySummary {
  category: string;
  total: number;
  paid: number;
}

export interface BudgetSummary {
  total: number;
  paid: number;
  remaining: number;
  percentPaid: number;
  groom: PartySummary;
  bride: PartySummary;
  counts: { all: number; enabled: number; disabled: number; paid: number; unpaid: number };
  byCategory: CategorySummary[];
}

export const UNCATEGORIZED = 'Uncategorized';

type SummaryItem = Pick<
  Item,
  'owner' | 'groomShareBp' | 'costMinor' | 'isPaid' | 'isEnabled' | 'category'
>;

/**
 * Totals for a list of items. Disabled items are skipped completely: they only count in
 * `counts.disabled` (decision D5: a disabled item is outside the plan, paid or not).
 */
export function summarize(items: readonly SummaryItem[]): BudgetSummary {
  let total = 0;
  let paid = 0;
  const groom = { total: 0, paid: 0 };
  const bride = { total: 0, paid: 0 };
  const counts = { all: items.length, enabled: 0, disabled: 0, paid: 0, unpaid: 0 };
  const categories = new Map<string, CategorySummary>();

  for (const item of items) {
    if (!item.isEnabled) {
      counts.disabled++;
      continue;
    }
    counts.enabled++;
    const portion = splitItem(item);
    total += item.costMinor;
    groom.total += portion.groom;
    bride.total += portion.bride;
    if (item.isPaid) {
      counts.paid++;
      paid += item.costMinor;
      groom.paid += portion.groom;
      bride.paid += portion.bride;
    } else {
      counts.unpaid++;
    }

    const key = item.category?.trim() || UNCATEGORIZED;
    const entry = categories.get(key) ?? { category: key, total: 0, paid: 0 };
    entry.total += item.costMinor;
    if (item.isPaid) entry.paid += item.costMinor;
    categories.set(key, entry);
  }

  return {
    total,
    paid,
    remaining: total - paid,
    percentPaid: total === 0 ? 0 : paid / total,
    groom: { ...groom, remaining: groom.total - groom.paid },
    bride: { ...bride, remaining: bride.total - bride.paid },
    counts,
    byCategory: [...categories.values()].sort(
      (a, b) => b.total - a.total || a.category.localeCompare(b.category),
    ),
  };
}
