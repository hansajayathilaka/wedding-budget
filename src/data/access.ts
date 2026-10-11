'use client';

import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebase } from '@/firebase/client';
import type { AccessRequest } from '@/lib/types';
import { toAccessRequest } from './converters';
import { useSnapshot } from './use-snapshot';

const requestRef = (weddingId: string, uid: string) => {
  const { db } = getFirebase();
  return doc(db, 'weddings', weddingId, 'requests', uid);
};

export function requestAccess(weddingId: string, user: User) {
  return setDoc(requestRef(weddingId, user.uid), {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  });
}

/** The signed-in user's own pending request for a wedding (`true` while it exists). */
export function useMyAccessRequest(weddingId: string, uid: string | undefined) {
  return useSnapshot<boolean>(
    false,
    () => {
      if (!uid) return null;
      return (next, error) =>
        onSnapshot(requestRef(weddingId, uid), (snap) => next(snap.exists()), error);
    },
    [weddingId, uid],
  );
}

/** Pending requests; only the wedding owner is allowed to list these. */
export function useAccessRequests(weddingId: string, enabled: boolean) {
  return useSnapshot<AccessRequest[]>(
    [],
    () => {
      if (!enabled) return null;
      const { db } = getFirebase();
      return (next, error) =>
        onSnapshot(
          collection(db, 'weddings', weddingId, 'requests'),
          (snap) => next(snap.docs.map(toAccessRequest).filter((r): r is AccessRequest => !!r)),
          error,
        );
    },
    [weddingId, enabled],
  );
}

export async function approveRequest(weddingId: string, request: AccessRequest) {
  const { db } = getFirebase();
  const batch = writeBatch(db);
  batch.update(doc(db, 'weddings', weddingId), {
    memberIds: arrayUnion(request.uid),
    [`memberProfiles.${request.uid}`]: {
      displayName: request.displayName,
      email: request.email,
    },
    updatedAt: serverTimestamp(),
  });
  batch.delete(requestRef(weddingId, request.uid));
  await batch.commit();
}

export function denyRequest(weddingId: string, uid: string) {
  return deleteDoc(requestRef(weddingId, uid));
}

export async function removeMember(weddingId: string, memberIds: string[], uid: string) {
  const { db } = getFirebase();
  await updateDoc(doc(db, 'weddings', weddingId), {
    memberIds: memberIds.filter((id) => id !== uid),
    [`memberProfiles.${uid}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}
