export type Owner = 'GROOM' | 'BRIDE' | 'SHARED';

export const OWNERS: readonly Owner[] = ['GROOM', 'BRIDE', 'SHARED'] as const;

export interface Wedding {
  id: string;
  name: string;
  groomName: string;
  brideName: string;
  weddingDate: Date;
  currency: string;
  defaultGroomShareBp: number;
  targetBudgetMinor: number | null;
  ownerId: string;
  memberIds: string[];
}

/** The fields of an item that are written by the user (no derived portions, no timestamps). */
export interface ItemInput {
  name: string;
  category: string | null;
  owner: Owner;
  groomShareBp: number;
  costMinor: number;
  isPaid: boolean;
  isEnabled: boolean;
  notes: string | null;
  sortOrder: number;
}

export interface Item extends ItemInput {
  id: string;
  groomPortionMinor: number;
  bridePortionMinor: number;
}

export interface AccessRequest {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
