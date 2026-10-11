'use client';

import type { ReactNode } from 'react';
import { useAuth } from './auth-provider';
import { SignInScreen } from './sign-in-screen';

/**
 * Signed-out visitors see the sign-in screen *in place* (no redirect), so after signing in they
 * stay on whatever URL they opened.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <SignInScreen />;
  return <>{children}</>;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    </div>
  );
}
