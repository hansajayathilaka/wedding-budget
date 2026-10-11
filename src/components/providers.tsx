'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/auth/auth-provider';
import { AuthGate } from '@/components/auth/auth-gate';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  );
}
