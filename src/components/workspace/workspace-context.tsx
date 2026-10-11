'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { WeddingWithProfiles } from '@/data/converters';
import { useItems } from '@/data/items';
import { summarize, type BudgetSummary } from '@/lib/budget';
import type { Item } from '@/lib/types';

interface Workspace {
  wedding: WeddingWithProfiles;
  items: Item[];
  itemsLoading: boolean;
  itemsError: boolean;
  summary: BudgetSummary;
}

const WorkspaceContext = createContext<Workspace | null>(null);

/** One live items subscription shared by the dashboard, items and settings pages. */
export function WorkspaceProvider({
  wedding,
  children,
}: {
  wedding: WeddingWithProfiles;
  children: ReactNode;
}) {
  const { data: items, loading, error } = useItems(wedding.id);
  const summary = useMemo(() => summarize(items), [items]);
  const value = useMemo<Workspace>(
    () => ({ wedding, items, itemsLoading: loading, itemsError: !!error, summary }),
    [wedding, items, loading, error, summary],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Workspace {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside a wedding workspace');
  return ctx;
}
