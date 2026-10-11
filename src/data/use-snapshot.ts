'use client';

import { useEffect, useRef, useState } from 'react';
import type { FirestoreError } from 'firebase/firestore';

export interface SnapshotState<T> {
  data: T;
  loading: boolean;
  error: FirestoreError | null;
}

export type Subscribe<T> = (
  next: (value: T) => void,
  error: (err: FirestoreError) => void,
) => () => void;

/**
 * Subscribes to a Firestore listener for the lifetime of the component.
 * `factory` may return null to stay idle (e.g. while signed out). It re-runs when `deps` change.
 */
export function useSnapshot<T>(
  initial: T,
  factory: () => Subscribe<T> | null,
  deps: unknown[],
): SnapshotState<T> {
  const initialRef = useRef(initial);
  const [state, setState] = useState<SnapshotState<T>>({
    data: initial,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const subscribe = factory();
    if (!subscribe) {
      setState({ data: initialRef.current, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    return subscribe(
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState({ data: initialRef.current, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
