import { describe, expect, it } from 'vitest';
import { splitItem, summarize, withPortions, UNCATEGORIZED } from '@/lib/budget';
import type { ItemInput } from '@/lib/types';

const item = (over: Partial<ItemInput> = {}): ItemInput => ({
  name: 'x',
  category: null,
  owner: 'GROOM',
  groomShareBp: 5000,
  costMinor: 1000,
  isPaid: false,
  isEnabled: true,
  notes: null,
  sortOrder: 0,
  ...over,
});

describe('splitItem', () => {
  it('groom pays everything', () =>
    expect(splitItem(item({ owner: 'GROOM' }))).toEqual({ groom: 1000, bride: 0 }));
  it('bride pays everything', () =>
    expect(splitItem(item({ owner: 'BRIDE' }))).toEqual({ groom: 0, bride: 1000 }));
  it('splits 60:40', () =>
    expect(splitItem(item({ owner: 'SHARED', groomShareBp: 6000 }))).toEqual({
      groom: 600,
      bride: 400,
    }));
  it('ratio edges', () => {
    expect(splitItem(item({ owner: 'SHARED', groomShareBp: 0 }))).toEqual({
      groom: 0,
      bride: 1000,
    });
    expect(splitItem(item({ owner: 'SHARED', groomShareBp: 10000 }))).toEqual({
      groom: 1000,
      bride: 0,
    });
  });
  it('never loses or creates a cent when rounding', () => {
    const p = splitItem(item({ owner: 'SHARED', groomShareBp: 3333, costMinor: 101 }));
    expect(p.groom).toBe(34);
    expect(p.groom + p.bride).toBe(101);
  });
  it('invariant holds for many costs and ratios', () => {
    for (let cost = 0; cost < 400; cost += 7) {
      for (let bp = 0; bp <= 10000; bp += 137) {
        const p = splitItem(item({ owner: 'SHARED', groomShareBp: bp, costMinor: cost }));
        expect(p.groom + p.bride).toBe(cost);
        expect(p.groom).toBeGreaterThanOrEqual(0);
        expect(p.bride).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('withPortions', () => {
  it('adds stored portions and keeps other fields', () => {
    const out = withPortions(item({ owner: 'SHARED', groomShareBp: 7000, costMinor: 1000 }));
    expect(out.groomPortionMinor).toBe(700);
    expect(out.bridePortionMinor).toBe(300);
    expect(out.name).toBe('x');
  });
});

describe('summarize', () => {
  it('is all zero for an empty list', () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.percentPaid).toBe(0);
    expect(s.counts).toEqual({ all: 0, enabled: 0, disabled: 0, paid: 0, unpaid: 0 });
    expect(s.byCategory).toEqual([]);
  });

  const items = [
    item({ owner: 'GROOM', costMinor: 1000, isPaid: true, category: 'Venue' }),
    item({ owner: 'BRIDE', costMinor: 2000, category: 'Attire' }),
    item({ owner: 'SHARED', groomShareBp: 7000, costMinor: 1000, isPaid: true, category: 'Venue' }),
    item({ owner: 'GROOM', costMinor: 5000, isEnabled: false, isPaid: true }),
    item({ owner: 'BRIDE', costMinor: 500 }),
  ];

  it('totals only enabled items (D5: disabled+paid is excluded from paid too)', () => {
    const s = summarize(items);
    expect(s.total).toBe(4500);
    expect(s.paid).toBe(2000);
    expect(s.remaining).toBe(2500);
    expect(s.percentPaid).toBeCloseTo(2000 / 4500);
  });

  it('splits per party and the parts add up', () => {
    const s = summarize(items);
    expect(s.groom).toEqual({ total: 1700, paid: 1700, remaining: 0 });
    expect(s.bride).toEqual({ total: 2800, paid: 300, remaining: 2500 });
    expect(s.groom.total + s.bride.total).toBe(s.total);
    expect(s.groom.paid + s.bride.paid).toBe(s.paid);
  });

  it('counts items', () => {
    expect(summarize(items).counts).toEqual({
      all: 5,
      enabled: 4,
      disabled: 1,
      paid: 2,
      unpaid: 2,
    });
  });

  it('groups by category, biggest first, with an uncategorized bucket', () => {
    const s = summarize(items);
    expect(s.byCategory).toEqual([
      { category: 'Attire', total: 2000, paid: 0 },
      { category: 'Venue', total: 2000, paid: 2000 },
      { category: UNCATEGORIZED, total: 500, paid: 0 },
    ]);
  });
});
