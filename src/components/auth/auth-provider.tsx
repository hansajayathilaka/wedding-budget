'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebase } from '@/firebase/client';

interface AuthState {
  user: User | null;
  /** true until Firebase has told us whether somebody is signed in */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, (user) => setState({ user, loading: false }));
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** The signed-in user. Only call inside <AuthGate>, which guarantees there is one. */
export function useUser(): User {
  const { user } = useContext(AuthContext);
  if (!user) throw new Error('useUser must be used inside <AuthGate>');
  return user;
}
