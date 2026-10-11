import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import { z } from 'zod';
import type { AccessRequest, Item, Wedding } from '@/lib/types';

const bp = z.number().int().min(0).max(10000);

const weddingDocSchema = z.object({
  name: z.string(),
  groomName: z.string(),
  brideName: z.string(),
  weddingDate: z.instanceof(Timestamp),
  currency: z.string().default('LKR'),
  defaultGroomShareBp: bp.default(5000),
  targetBudgetMinor: z.number().int().nullable().default(null),
  ownerId: z.string(),
  memberIds: z.array(z.string()),
  memberProfiles: z
    .record(
      z.string(),
      z.object({
        displayName: z.string().nullable().default(null),
        email: z.string().nullable().default(null),
      }),
    )
    .default({}),
});

export type MemberProfiles = z.infer<typeof weddingDocSchema>['memberProfiles'];

export type WeddingWithProfiles = Wedding & { memberProfiles: MemberProfiles };

const itemDocSchema = z.object({
  name: z.string(),
  category: z.string().nullable().default(null),
  owner: z.enum(['GROOM', 'BRIDE', 'SHARED']),
  groomShareBp: bp,
  costMinor: z.number().int().min(0),
  groomPortionMinor: z.number().int().min(0),
  bridePortionMinor: z.number().int().min(0),
  isPaid: z.boolean(),
  isEnabled: z.boolean(),
  notes: z.string().nullable().default(null),
  sortOrder: z.number().default(0),
});

const requestDocSchema = z.object({
  uid: z.string(),
  displayName: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  photoURL: z.string().nullable().default(null),
});

/** Maps a snapshot to a typed wedding, validating with Zod. Returns null for malformed docs. */
export function toWedding(snap: DocumentSnapshot<DocumentData>): WeddingWithProfiles | null {
  const parsed = weddingDocSchema.safeParse(snap.data({ serverTimestamps: 'estimate' }));
  if (!parsed.success) return null;
  const { weddingDate, ...rest } = parsed.data;
  return { id: snap.id, ...rest, weddingDate: weddingDate.toDate() };
}

export function toItem(snap: DocumentSnapshot<DocumentData>): Item | null {
  const parsed = itemDocSchema.safeParse(snap.data({ serverTimestamps: 'estimate' }));
  if (!parsed.success) return null;
  return { id: snap.id, ...parsed.data };
}

export function toAccessRequest(snap: DocumentSnapshot<DocumentData>): AccessRequest | null {
  const parsed = requestDocSchema.safeParse(snap.data({ serverTimestamps: 'estimate' }));
  return parsed.success ? parsed.data : null;
}
