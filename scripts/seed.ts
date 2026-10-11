/**
 * Seeds the local Firebase emulators with a demo user and one demo wedding (~20 items).
 *
 *   npm run emulators        # in one terminal
 *   npm run seed             # in another
 *
 * Then sign in with the emulator form using demo@example.com.
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { withPortions } from '../src/lib/budget';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_WEDDING_ID, demoItems, demoWedding } from './seed-data';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-wedding-budget';

export async function seedDemo() {
  const app = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(DEMO_EMAIL).catch(() =>
    auth.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: 'Demo User',
      emailVerified: true,
    }),
  );

  const date = new Date();
  date.setDate(date.getDate() + 124);
  date.setHours(10, 0, 0, 0);

  const ref = db.collection('weddings').doc(DEMO_WEDDING_ID);
  await ref.set({
    ...demoWedding,
    weddingDate: Timestamp.fromDate(date),
    ownerId: user.uid,
    memberIds: [user.uid],
    memberProfiles: { [user.uid]: { displayName: user.displayName ?? null, email: DEMO_EMAIL } },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const batch = db.batch();
  demoItems.forEach((item, index) => {
    batch.set(ref.collection('items').doc(`seed-${String(index).padStart(2, '0')}`), {
      ...withPortions({ ...item, sortOrder: index }),
      sortOrder: index,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  console.log(`Seeded /w/${DEMO_WEDDING_ID} with ${demoItems.length} items for ${DEMO_EMAIL}`);
}

if (require.main === module) {
  seedDemo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
