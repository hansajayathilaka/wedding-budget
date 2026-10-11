import type { Metadata } from 'next';
import { WeddingsHome } from '@/components/weddings/weddings-home';

export const metadata: Metadata = { title: 'My weddings' };

export default function HomePage() {
  return <WeddingsHome />;
}
