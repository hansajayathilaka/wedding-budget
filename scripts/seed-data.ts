import type { ItemInput } from '../src/lib/types';

export const DEMO_WEDDING_ID = 'demo234567';
export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'emulator-password';

export const demoWedding = {
  name: "Hansa & Nimali's Wedding",
  groomName: 'Hansa',
  brideName: 'Nimali',
  currency: 'LKR',
  defaultGroomShareBp: 5000,
  targetBudgetMinor: 250_000_000,
};

const i = (
  name: string,
  category: string,
  owner: ItemInput['owner'],
  cost: number,
  extra: Partial<ItemInput> = {},
): Omit<ItemInput, 'sortOrder'> => ({
  name,
  category,
  owner,
  groomShareBp: 5000,
  costMinor: Math.round(cost * 100),
  isPaid: false,
  isEnabled: true,
  notes: null,
  ...extra,
});

/** ~20 realistic items covering every owner, paid/unpaid and disabled states. */
export const demoItems: Array<Omit<ItemInput, 'sortOrder'>> = [
  i('Reception hall', 'Venue', 'SHARED', 650000, { groomShareBp: 6000, isPaid: true }),
  i('Hall decoration', 'Decoration', 'SHARED', 180000, { groomShareBp: 7000 }),
  i('Catering (300 guests)', 'Catering', 'SHARED', 900000, { groomShareBp: 5000 }),
  i('Wedding cake', 'Catering', 'GROOM', 45000),
  i('Welcome drinks', 'Catering', 'GROOM', 60000, { isPaid: true }),
  i('Groom suit', 'Attire', 'GROOM', 120000, { isPaid: true }),
  i('Groom shoes', 'Attire', 'GROOM', 15000),
  i('Bridal saree', 'Attire', 'BRIDE', 220000, { isPaid: true }),
  i('Going-away outfit', 'Attire', 'BRIDE', 65000),
  i('Bridal makeup', 'Attire', 'BRIDE', 55000, { isPaid: true }),
  i('Photographer', 'Photography', 'SHARED', 240000, { groomShareBp: 3333, isPaid: true }),
  i('Videographer', 'Photography', 'SHARED', 150000, { groomShareBp: 3333 }),
  i('Wedding album', 'Photography', 'BRIDE', 40000),
  i('DJ & sound', 'Music & Entertainment', 'GROOM', 85000),
  i('Band', 'Music & Entertainment', 'SHARED', 120000, { isEnabled: false }),
  i('Wedding cars', 'Transport', 'GROOM', 50000),
  i('Guest buses', 'Transport', 'SHARED', 70000, { groomShareBp: 4000 }),
  i('Rings', 'Rings & Jewelry', 'SHARED', 300000, { groomShareBp: 5000, isPaid: true }),
  i('Invitations', 'Invitations', 'BRIDE', 35000, { isPaid: true }),
  i('Flowers & bouquet', 'Flowers', 'BRIDE', 28000),
  i('Honeymoon', 'Honeymoon', 'GROOM', 400000, { isEnabled: false, isPaid: true }),
];
