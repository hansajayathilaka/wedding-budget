import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const OWNER = 'owner-uid';
const PARTNER = 'partner-uid';
const STRANGER = 'stranger-uid';
const W = 'abcde23456';

const weddingData = (over: Record<string, unknown> = {}) => ({
  name: "A & B's Wedding",
  groomName: 'A',
  brideName: 'B',
  weddingDate: Timestamp.fromDate(new Date('2030-01-01')),
  currency: 'LKR',
  defaultGroomShareBp: 5000,
  targetBudgetMinor: null,
  ownerId: OWNER,
  memberIds: [OWNER],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

const itemData = (over: Record<string, unknown> = {}) => ({
  name: 'Venue',
  category: 'Venue',
  owner: 'SHARED',
  groomShareBp: 6000,
  costMinor: 1000,
  groomPortionMinor: 600,
  bridePortionMinor: 400,
  isPaid: false,
  isEnabled: true,
  notes: null,
  sortOrder: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();

async function seed(members = [OWNER]) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'weddings', W), {
      ...weddingData({ memberIds: members }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, 'weddings', W, 'items', 'i1'), {
      ...itemData(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wedding-budget-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

describe('weddings', () => {
  it('lets a signed-in user create their own wedding', async () => {
    await assertSucceeds(setDoc(doc(as(OWNER), 'weddings', W), weddingData()));
  });

  it('rejects create when signed out', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData()));
  });

  it('rejects create claiming someone else as owner or extra members', async () => {
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData({ ownerId: STRANGER })));
    await assertFails(
      setDoc(doc(db, 'weddings', W), weddingData({ memberIds: [OWNER, STRANGER] })),
    );
  });

  it('rejects invalid wedding fields', async () => {
    const db = as(OWNER);
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData({ name: '' })));
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData({ currency: 'lkr' })));
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData({ defaultGroomShareBp: 10001 })));
    await assertFails(setDoc(doc(db, 'weddings', W), weddingData({ extra: 1 })));
  });

  it('members can read; non-members and signed-out users cannot', async () => {
    await seed([OWNER, PARTNER]);
    await assertSucceeds(getDoc(doc(as(OWNER), 'weddings', W)));
    await assertSucceeds(getDoc(doc(as(PARTNER), 'weddings', W)));
    await assertFails(getDoc(doc(as(STRANGER), 'weddings', W)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'weddings', W)));
  });

  it('only allows listing weddings you are a member of', async () => {
    await seed();
    const mine = query(
      collection(as(OWNER), 'weddings'),
      where('memberIds', 'array-contains', OWNER),
    );
    await assertSucceeds(getDocs(mine));
    const notMine = query(
      collection(as(STRANGER), 'weddings'),
      where('memberIds', 'array-contains', OWNER),
    );
    await assertFails(getDocs(notMine));
    await assertFails(getDocs(collection(as(STRANGER), 'weddings')));
  });

  it('members can rename; non-members cannot update', async () => {
    await seed([OWNER, PARTNER]);
    const patch = { name: 'Renamed', updatedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(as(PARTNER), 'weddings', W), patch));
    await assertFails(updateDoc(doc(as(STRANGER), 'weddings', W), patch));
  });

  it('nobody can change ownerId', async () => {
    await seed([OWNER, PARTNER]);
    const patch = { ownerId: PARTNER, updatedAt: serverTimestamp() };
    await assertFails(updateDoc(doc(as(OWNER), 'weddings', W), patch));
    await assertFails(updateDoc(doc(as(PARTNER), 'weddings', W), patch));
  });

  it('only the owner can change memberIds', async () => {
    await seed([OWNER, PARTNER]);
    const add = { memberIds: arrayUnion(STRANGER), updatedAt: serverTimestamp() };
    await assertFails(updateDoc(doc(as(PARTNER), 'weddings', W), add));
    await assertSucceeds(updateDoc(doc(as(OWNER), 'weddings', W), add));
  });

  it('only the owner can change memberProfiles', async () => {
    await seed([OWNER, PARTNER]);
    const patch = {
      memberProfiles: { [PARTNER]: { displayName: 'P', email: null } },
      updatedAt: serverTimestamp(),
    };
    await assertFails(updateDoc(doc(as(PARTNER), 'weddings', W), patch));
    await assertSucceeds(updateDoc(doc(as(OWNER), 'weddings', W), patch));
  });

  it('the owner can remove a partner', async () => {
    await seed([OWNER, PARTNER]);
    await assertSucceeds(
      updateDoc(doc(as(OWNER), 'weddings', W), {
        memberIds: [OWNER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('the owner cannot remove themselves from memberIds', async () => {
    await seed([OWNER, PARTNER]);
    await assertFails(
      updateDoc(doc(as(OWNER), 'weddings', W), {
        memberIds: [PARTNER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('requires updatedAt to be the server time', async () => {
    await seed();
    await assertFails(
      updateDoc(doc(as(OWNER), 'weddings', W), { name: 'x', updatedAt: Timestamp.fromMillis(1) }),
    );
  });

  it('only the owner can delete', async () => {
    await seed([OWNER, PARTNER]);
    await assertFails(deleteDoc(doc(as(PARTNER), 'weddings', W)));
    await assertFails(deleteDoc(doc(as(STRANGER), 'weddings', W)));
    await assertSucceeds(deleteDoc(doc(as(OWNER), 'weddings', W)));
  });
});

describe('items', () => {
  const item = (uid: string, id = 'i2') => doc(as(uid), 'weddings', W, 'items', id);

  it('members can read and create items; strangers cannot', async () => {
    await seed([OWNER, PARTNER]);
    await assertSucceeds(getDoc(item(PARTNER, 'i1')));
    await assertSucceeds(setDoc(item(PARTNER), itemData()));
    await assertFails(getDoc(item(STRANGER, 'i1')));
    await assertFails(setDoc(item(STRANGER, 'i3'), itemData()));
    await assertFails(getDocs(collection(as(STRANGER), 'weddings', W, 'items')));
  });

  it('rejects negative cost, bad ratio and mismatched portions', async () => {
    await seed();
    await assertFails(
      setDoc(item(OWNER), itemData({ costMinor: -1, groomPortionMinor: 0, bridePortionMinor: -1 })),
    );
    await assertFails(setDoc(item(OWNER), itemData({ groomShareBp: 10001 })));
    await assertFails(
      setDoc(item(OWNER), itemData({ groomPortionMinor: 500, bridePortionMinor: 400 })),
    );
    await assertFails(setDoc(item(OWNER), itemData({ costMinor: 10.5 })));
  });

  it('rejects wrong portions for single-owner items', async () => {
    await seed();
    await assertSucceeds(
      setDoc(
        item(OWNER, 'g'),
        itemData({ owner: 'GROOM', groomPortionMinor: 1000, bridePortionMinor: 0 }),
      ),
    );
    await assertFails(
      setDoc(
        item(OWNER, 'g2'),
        itemData({ owner: 'GROOM', groomPortionMinor: 0, bridePortionMinor: 1000 }),
      ),
    );
    await assertFails(
      setDoc(
        item(OWNER, 'b'),
        itemData({ owner: 'BRIDE', groomPortionMinor: 1000, bridePortionMinor: 0 }),
      ),
    );
  });

  it('rejects unknown owner, empty name and unknown fields', async () => {
    await seed();
    await assertFails(setDoc(item(OWNER), itemData({ owner: 'NOBODY' })));
    await assertFails(setDoc(item(OWNER), itemData({ name: '' })));
    await assertFails(setDoc(item(OWNER), itemData({ hacked: true })));
    await assertFails(setDoc(item(OWNER), itemData({ isPaid: 'yes' })));
  });

  it('allows toggling paid/enabled and rejects invalid updates', async () => {
    await seed();
    await assertSucceeds(
      updateDoc(item(OWNER, 'i1'), { isPaid: true, updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(item(OWNER, 'i1'), { isEnabled: false, updatedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(item(OWNER, 'i1'), { costMinor: 5, updatedAt: serverTimestamp() }));
  });

  it('members can delete items; strangers cannot', async () => {
    await seed([OWNER, PARTNER]);
    await assertFails(deleteDoc(item(STRANGER, 'i1')));
    await assertSucceeds(deleteDoc(item(PARTNER, 'i1')));
  });
});

describe('access requests', () => {
  const req = (uid: string, asUid = uid) => doc(as(asUid), 'weddings', W, 'requests', uid);
  const reqData = (uid: string, over: Record<string, unknown> = {}) => ({
    uid,
    displayName: 'Stranger',
    email: 's@example.com',
    photoURL: null,
    createdAt: serverTimestamp(),
    ...over,
  });

  it('a user can only create a request for their own uid', async () => {
    await seed();
    await assertSucceeds(setDoc(req(STRANGER), reqData(STRANGER)));
    await assertFails(setDoc(req(PARTNER, STRANGER), reqData(PARTNER)));
    await assertFails(setDoc(req(STRANGER), reqData('someone-else')));
  });

  it('cannot request access to a wedding that does not exist', async () => {
    await assertFails(
      setDoc(doc(as(STRANGER), 'weddings', 'nonexistent', 'requests', STRANGER), reqData(STRANGER)),
    );
  });

  it('only the owner and the requester can read; owner can approve and deny', async () => {
    await seed([OWNER, PARTNER]);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'weddings', W, 'requests', STRANGER), {
        uid: STRANGER,
        createdAt: Timestamp.now(),
      });
    });
    await assertSucceeds(getDoc(req(STRANGER)));
    await assertSucceeds(getDoc(req(STRANGER, OWNER)));
    await assertFails(getDoc(req(STRANGER, PARTNER)));
    await assertFails(deleteDoc(req(STRANGER, PARTNER)));
    await assertSucceeds(deleteDoc(req(STRANGER, OWNER)));
  });
});
