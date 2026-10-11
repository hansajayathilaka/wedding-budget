import { describe, expect, it } from 'vitest';
import { itemInputSchema, weddingInputSchema } from '@/lib/validation';
import { isWeddingId, newWeddingId } from '@/lib/ids';

const validItem = {
  name: ' Venue ',
  category: '',
  owner: 'SHARED' as const,
  groomShareBp: 6000,
  costMinor: 100000,
  isPaid: false,
  isEnabled: true,
  notes: null,
  sortOrder: 0,
};

describe('itemInputSchema', () => {
  it('trims and normalises empty strings to null', () => {
    const out = itemInputSchema.parse(validItem);
    expect(out.name).toBe('Venue');
    expect(out.category).toBeNull();
  });
  it('rejects bad values', () => {
    expect(itemInputSchema.safeParse({ ...validItem, name: '  ' }).success).toBe(false);
    expect(itemInputSchema.safeParse({ ...validItem, costMinor: -1 }).success).toBe(false);
    expect(itemInputSchema.safeParse({ ...validItem, costMinor: 1.5 }).success).toBe(false);
    expect(itemInputSchema.safeParse({ ...validItem, groomShareBp: 10001 }).success).toBe(false);
    expect(itemInputSchema.safeParse({ ...validItem, owner: 'NOBODY' }).success).toBe(false);
  });
});

describe('weddingInputSchema', () => {
  const valid = {
    name: 'A & B',
    groomName: 'A',
    brideName: 'B',
    weddingDate: new Date(),
    currency: 'LKR',
    defaultGroomShareBp: 5000,
  };
  it('applies defaults', () =>
    expect(weddingInputSchema.parse(valid).targetBudgetMinor).toBeNull());
  it('rejects bad currency / ratio', () => {
    expect(weddingInputSchema.safeParse({ ...valid, currency: 'lkr' }).success).toBe(false);
    expect(weddingInputSchema.safeParse({ ...valid, defaultGroomShareBp: -1 }).success).toBe(false);
  });
});

describe('ids', () => {
  it('generates 10 char ids that validate', () => {
    const id = newWeddingId();
    expect(id).toHaveLength(10);
    expect(isWeddingId(id)).toBe(true);
    expect(isWeddingId('nope')).toBe(false);
  });
});
