import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, filterItems, filtersToSearch, parseFilters } from '@/lib/filters';
import type { Item } from '@/lib/types';

const mk = (over: Partial<Item>): Item => ({
  id: 'x',
  name: 'Item',
  category: null,
  owner: 'GROOM',
  groomShareBp: 5000,
  costMinor: 100,
  groomPortionMinor: 100,
  bridePortionMinor: 0,
  isPaid: false,
  isEnabled: true,
  notes: null,
  sortOrder: 0,
  ...over,
});

const items = [
  mk({ id: '1', name: 'Hall', category: 'Venue', owner: 'SHARED', isPaid: true }),
  mk({ id: '2', name: 'Dress', category: 'Attire', owner: 'BRIDE' }),
  mk({ id: '3', name: 'Suit', owner: 'GROOM', isEnabled: false, notes: 'tailor' }),
];
const ids = (xs: Item[]) => xs.map((i) => i.id);

describe('filterItems', () => {
  it('returns everything by default', () =>
    expect(ids(filterItems(items, DEFAULT_FILTERS))).toEqual(['1', '2', '3']));
  it('hides disabled when asked', () =>
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, showDisabled: false }))).toEqual([
      '1',
      '2',
    ]));
  it('filters by owner', () =>
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, owner: 'BRIDE' }))).toEqual(['2']));
  it('filters by paid / unpaid', () => {
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, status: 'paid' }))).toEqual(['1']);
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, status: 'unpaid' }))).toEqual(['2', '3']);
  });
  it('status=disabled shows only disabled items, even if disabled are hidden', () =>
    expect(
      ids(filterItems(items, { ...DEFAULT_FILTERS, status: 'disabled', showDisabled: false })),
    ).toEqual(['3']));
  it('searches name, category and notes case-insensitively', () => {
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, q: 'VENUE' }))).toEqual(['1']);
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, q: 'tailor' }))).toEqual(['3']);
    expect(ids(filterItems(items, { ...DEFAULT_FILTERS, q: 'zzz' }))).toEqual([]);
  });
});

describe('url round trip', () => {
  it('default filters give an empty query string', () =>
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe(''));
  it('round-trips non-default values', () => {
    const f = { q: 'a b', owner: 'SHARED' as const, status: 'paid' as const, showDisabled: false };
    expect(parseFilters(new URLSearchParams(filtersToSearch(f)))).toEqual(f);
  });
  it('ignores garbage', () =>
    expect(parseFilters(new URLSearchParams('owner=X&status=Y'))).toEqual(DEFAULT_FILTERS));
});
