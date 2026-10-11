import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-wedding-budget.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-wedding-budget',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: Services | null = null;

/** Lazily creates the Firebase app (once, also across HMR reloads). Browser only. */
export function getFirebase(): Services {
  if (services) return services;

  const existing = getApps().length > 0;
  const app = existing ? getApp() : initializeApp(config);
  const auth = getAuth(app);

  let db: Firestore;
  if (existing) {
    db = getFirestore(app);
  } else {
    // Persistent cache = offline support and instant local writes shared across tabs.
    // The emulator keeps a memory cache so stale data never leaks between test runs.
    db = USE_EMULATORS
      ? initializeFirestore(app, {})
      : initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });
    if (USE_EMULATORS) {
      const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
    }
  }

  services = { app, auth, db };
  return services;
}
