'use client';

import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { Heart } from 'lucide-react';
import { getFirebase, USE_EMULATORS } from '@/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(getFirebase().auth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950">
          <Heart className="size-7" aria-hidden />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Wedding Budget</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to plan and track your wedding budget together.
          </p>
        </div>
        <Button className="w-full" size="lg" onClick={google} disabled={busy}>
          Continue with Google
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {USE_EMULATORS && <EmulatorSignIn />}
      </div>
    </main>
  );
}

/** Email/password sign-in against the Auth emulator only (local dev and e2e tests). */
function EmulatorSignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { auth } = getFirebase();
    const password = 'emulator-password';
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError((err as Error).message);
      }
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-4 text-left" data-testid="dev-sign-in">
      <p className="text-xs font-medium text-muted-foreground">Emulator sign-in (dev only)</p>
      <Input
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Emulator email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" variant="outline" className="w-full">
        Sign in with email
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
