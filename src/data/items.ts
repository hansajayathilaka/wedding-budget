'use client';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirebase } from '@/firebase/client';
import { withPortions } from '@/lib/budget';
import type { Item, ItemInput } from '@/lib/types';
import { itemInputSchema } from '@/lib/validation';
import { toItem } from './converters';
import { useSnapshot } from './use-snapshot';

export function useItems(weddingId: string, enabled = true) {
  return useSnapshot<Item[]>(
    [],
    () => {
      if (!enabled) return null;
      const { db } = getFirebase();
      const q = query(collection(db, 'weddings', weddingId, 'items'), orderBy('sortOrder', 'asc'));
      return (next, error) =>
        onSnapshot(q, (snap) => next(snap.docs.map(toItem).filter((i): i is Item => !!i)), error);
    },
    [weddingId, enabled],
  );
}

const itemRef = (weddingId: string, itemId: string) => {
  const { db } = getFirebase();
  return doc(db, 'weddings', weddingId, 'items', itemId);
};

/** Validates, derives the stored portions, and writes. Local cache updates immediately. */
export function createItem(weddingId: string, input: ItemInput) {
  const data = withPortions(itemInputSchema.parse(input));
  const { db } = getFirebase();
  const ref = doc(collection(db, 'weddings', weddingId, 'items'));
  return setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export function updateItem(weddingId: string, itemId: string, input: ItemInput) {
  const data = withPortions(itemInputSchema.parse(input));
  return updateDoc(itemRef(weddingId, itemId), { ...data, updatedAt: serverTimestamp() });
}

export function setItemPaid(weddingId: string, itemId: string, isPaid: boolean) {
  return updateDoc(itemRef(weddingId, itemId), { isPaid, updatedAt: serverTimestamp() });
}

export function setItemEnabled(weddingId: string, itemId: string, isEnabled: boolean) {
  return updateDoc(itemRef(weddingId, itemId), { isEnabled, updatedAt: serverTimestamp() });
}

export function deleteItem(weddingId: string, itemId: string) {
  return deleteDoc(itemRef(weddingId, itemId));
}

/** Copies an item next to the original (sorted right after it). */
export function duplicateItem(weddingId: string, item: Item) {
  return createItem(weddingId, {
    name: `${item.name} (copy)`.slice(0, 120),
    category: item.category,
    owner: item.owner,
    groomShareBp: item.groomShareBp,
    costMinor: item.costMinor,
    isPaid: false,
    isEnabled: item.isEnabled,
    notes: item.notes,
    sortOrder: item.sortOrder + 1,
  });
}

export function nextSortOrder(): number {
  return Date.now();
}
