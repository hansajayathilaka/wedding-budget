import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ItemsView } from '@/components/items/items-view';

export const metadata: Metadata = { title: 'Items' };

export default function ItemsPage() {
  // useSearchParams (filters live in the URL) needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <ItemsView />
    </Suspense>
  );
}
