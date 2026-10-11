'use client';

import { useCallback, useState } from 'react';
import {
  collection,
  count,
  deleteDoc,
  doc,
  getAggregateFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  sum,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebase } from '@/firebase/client';
import { newWeddingId } from '@/lib/ids';
import { weddingInputSchema, type WeddingInput } from '@/lib/validation';
import { toWedding, type WeddingWithProfiles } from './converters';
import { useSnapshot } from './use-snapshot';

export function useMyWeddings(uid: string | undefined) {
  return useSnapshot<WeddingWithProfiles[]>(
    [],
    () => {
      if (!uid) return null;
      const { db } = getFirebase();
      const q = query(
        collection(db, 'weddings'),
        where('memberIds', 'array-contains', uid),
        orderBy('weddingDate', 'asc'),
      );
      return (next, error) =>
        onSnapshot(
          q,
          (snap) => next(snap.docs.map(toWedding).filter((w): w is WeddingWithProfiles => !!w)),
          error,
        );
    },
    [uid],
  );
}

export type WeddingStatus = 'loading' | 'ready' | 'denied';

/**
 * Live wedding document. Missing docs and permission errors are both reported as `denied`:
 * rules can't tell "does not exist" from "not yours", and neither should the UI.
 * `retry()` resubscribes (used after an access request is approved).
 */
export function useWedding(weddingId: string) {
  const [attempt, setAttempt] = useState(0);
  const state = useSnapshot<WeddingWithProfiles | null>(
    null,
    () => {
      const { db } = getFirebase();
      return (next, error) =>
        onSnapshot(
          doc(db, 'weddings', weddingId),
          (snap) => next(snap.exists() ? toWedding(snap) : null),
          error,
        );
    },
    [weddingId, attempt],
  );
  const status: WeddingStatus = state.loading
    ? 'loading'
    : state.data && !state.error
      ? 'ready'
      : 'denied';
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { wedding: state.data, status, retry };
}

function memberProfile(user: User) {
  return { displayName: user.displayName, email: user.email };
}

/** Writes weddings/{nanoid}. Resolves once the server accepts it; the id is known up front. */
export function createWedding(input: WeddingInput, user: User) {
  const data = weddingInputSchema.parse(input);
  const { db } = getFirebase();
  const id = newWeddingId();
  const written = (async () => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'weddings', id), {
      ...data,
      weddingDate: Timestamp.fromDate(data.weddingDate),
      ownerId: user.uid,
      memberIds: [user.uid],
      memberProfiles: { [user.uid]: memberProfile(user) },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  })();
  return { id, written };
}

export type WeddingPatch = Partial<
  Pick<
    WeddingInput,
    | 'name'
    | 'groomName'
    | 'brideName'
    | 'weddingDate'
    | 'currency'
    | 'defaultGroomShareBp'
    | 'targetBudgetMinor'
  >
>;

export async function updateWedding(weddingId: string, patch: WeddingPatch) {
  const { db } = getFirebase();
  const { weddingDate, ...rest } = patch;
  await updateDoc(doc(db, 'weddings', weddingId), {
    ...rest,
    ...(weddingDate ? { weddingDate: Timestamp.fromDate(weddingDate) } : {}),
    updatedAt: serverTimestamp(),
  });
}

const BATCH_SIZE = 450;

/** Deletes items/*, requests/* (in chunks) and then the wedding doc itself. */
export async function deleteWedding(weddingId: string) {
  const { db } = getFirebase();
  for (const sub of ['items', 'requests']) {
    for (;;) {
      const snap = await getDocs(
        query(collection(db, 'weddings', weddingId, sub), limit(BATCH_SIZE)),
      );
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, 'weddings', weddingId));
}

export interface WeddingCardStats {
  total: number;
  paid: number;
  groom: number;
  bride: number;
  itemCount: number;
}

/**
 * Totals for the `/` cards via aggregation queries, so we don't download every item.
 * Only enabled items count (D5).
 */
export async function getWeddingCardStats(weddingId: string): Promise<WeddingCardStats> {
  const { db } = getFirebase();
  const items = collection(db, 'weddings', weddingId, 'items');
  const enabled = query(items, where('isEnabled', '==', true));
  const paid = query(items, where('isEnabled', '==', true), where('isPaid', '==', true));
  const [all, paidAgg] = await Promise.all([
    getAggregateFromServer(enabled, {
      total: sum('costMinor'),
      groom: sum('groomPortionMinor'),
      bride: sum('bridePortionMinor'),
      itemCount: count(),
    }),
    getAggregateFromServer(paid, { paid: sum('costMinor') }),
  ]);
  return { ...all.data(), paid: paidAgg.data().paid };
}
