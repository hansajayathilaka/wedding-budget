'use client';

import { useId, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { getFirebase } from '@/firebase/client';
import { authErrorMessage, MIN_PASSWORD_LENGTH, validatePassword } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup' | 'reset';

const TABS: Array<{ mode: Exclude<Mode, 'reset'>; label: string }> = [
  { mode: 'signin', label: 'Sign in' },
  { mode: 'signup', label: 'Create account' },
];

/** Email + password: sign in, create an account, or ask for a password reset email. */
export function PasswordForm() {
  const id = useId();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const { auth } = getFirebase();

    if (mode !== 'reset') {
      const problem = mode === 'signup' ? validatePassword(password) : null;
      if (problem) {
        setError(problem);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        // Same message whether or not the address has an account.
        setNotice('If an account exists for that email, we’ve sent a link to reset the password.');
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      // For resets, don't reveal unknown addresses; only surface problems the user can fix.
      if (mode === 'reset' && code === 'auth/user-not-found') {
        setNotice('If an account exists for that email, we’ve sent a link to reset the password.');
      } else {
        setError(authErrorMessage(code));
      }
    } finally {
      setBusy(false);
    }
  }

  const submitLabel =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <form onSubmit={submit} className="space-y-4 text-left" data-testid="password-auth" noValidate>
      {mode !== 'reset' ? (
        <div
          role="tablist"
          aria-label="Account options"
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.mode}
              type="button"
              role="tab"
              aria-selected={mode === t.mode}
              onClick={() => switchMode(t.mode)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                mode === t.mode
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter your email and we’ll send you a link to choose a new password.
        </p>
      )}

      {mode === 'signup' && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>Your name</Label>
          <Input
            id={`${id}-name`}
            autoComplete="name"
            placeholder="Optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {mode !== 'reset' && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-password`}>Password</Label>
          <div className="relative">
            <Input
              id={`${id}-password`}
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-muted p-3 text-sm">
          {notice}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Please wait…' : submitLabel}
      </Button>

      <div className="text-center text-sm">
        {mode === 'signin' && (
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </button>
        )}
        {mode === 'reset' && (
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </button>
        )}
      </div>
    </form>
  );
}
