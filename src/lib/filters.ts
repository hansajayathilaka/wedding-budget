import type { Item, Owner } from './types';

export type StatusFilter = 'all' | 'unpaid' | 'paid' | 'disabled';

export interface ItemFilters {
  q: string;
  owner: Owner | 'ALL';
  status: StatusFilter;
  showDisabled: boolean;
}

export const DEFAULT_FILTERS: ItemFilters = {
  q: '',
  owner: 'ALL',
  status: 'all',
  showDisabled: true,
};

type Params = { get(name: string): string | null };

/** Filters live in the URL search params so they survive reloads and can be linked to. */
export function parseFilters(params: Params): ItemFilters {
  const owner = params.get('owner');
  const status = params.get('status');
  return {
    q: params.get('q') ?? '',
    owner: owner === 'GROOM' || owner === 'BRIDE' || owner === 'SHARED' ? owner : 'ALL',
    status: status === 'unpaid' || status === 'paid' || status === 'disabled' ? status : 'all',
    showDisabled: params.get('disabled') !== 'hide',
  };
}

/** Only non-default values are written, so the default view has a clean URL. */
export function filtersToSearch(filters: ItemFilters): string {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.owner !== 'ALL') p.set('owner', filters.owner);
  if (filters.status !== 'all') p.set('status', filters.status);
  if (!filters.showDisabled) p.set('disabled', 'hide');
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function filterItems(items: readonly Item[], f: ItemFilters): Item[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((item) => {
    if (f.owner !== 'ALL' && item.owner !== f.owner) return false;
    if (f.status === 'disabled') {
      if (item.isEnabled) return false;
    } else {
      if (!item.isEnabled && !f.showDisabled) return false;
      if (f.status === 'paid' && !item.isPaid) return false;
      if (f.status === 'unpaid' && item.isPaid) return false;
    }
    if (q) {
      const hay = `${item.name} ${item.category ?? ''} ${item.notes ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
