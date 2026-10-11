# Wedding Budget Planner: Implementation Plan

A multi-wedding (SaaS-style) budget planner. It uses **Next.js** for the frontend and
**Firebase** as the backend (Auth, Firestore, App Hosting). Each wedding gets its own URL and
a self-contained workspace. Inside a workspace you track every budget item, who pays for it
(groom, bride, or shared by a custom ratio), and whether it has been paid. A dashboard shows
totals, what's paid, what's left and a countdown to the wedding date.

---

## 1. Requirements

### Functional

| # | Requirement | Notes |
|---|-------------|-------|
| F1 | Create multiple weddings | Root page `/` lists your weddings as cards. |
| F2 | Each wedding has its own URL | `/w/{weddingId}`. The ID is random and hard to guess. |
| F3 | Wedding workspace has no way back to `/` | No back button, logo link or breadcrumb. You reach `/` only by typing it. |
| F4 | Add, edit and delete budget items | Delete asks for confirmation. |
| F5 | Item owner: Groom, Bride or Shared | Each owner has its own color. |
| F6 | Shared items split by any ratio | e.g. 60:40 or 70:30. The default ratio is set per wedding. |
| F7 | Track the cost of each item | Money is stored as integer minor units. |
| F8 | Paid / not paid tick | One boolean toggle. |
| F9 | Disable an item without deleting it | Disabled items are left out of every total and shown dimmed and translucent. |
| F10 | Rename everything | Wedding name, couple names and item names. |
| F11 | Dashboard | Total budget, paid, remaining, % paid, countdown, groom/bride breakdown and item counts. |

### Non-functional
- Works on mobile first. Most use will be on a phone.
- Edits show up instantly. Firestore applies local writes before the server confirms them, so
  no hand-written optimistic code is needed.
- Live sync: when the bride ticks an item as paid, the groom's open dashboard updates right away.
- No floating-point money math.
- Access is enforced by **Firestore Security Rules**, not by the client.

---

## 2. Tech Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Frontend | **Next.js 15 (App Router) + TypeScript** | Routing, layouts, React. |
| Auth | **Firebase Authentication** (Google sign-in, email link optional) | Needed to list "my weddings" and to secure data. See §5. |
| Database | **Cloud Firestore** | Real-time listeners, offline cache, security rules, `sum()`/`count()` aggregations. |
| Data access | **Firebase JS SDK (modular)**, client-side | Reads and writes go straight to Firestore and are checked by rules. No API layer needed. |
| Server logic | None in MVP. **Cloud Functions** are optional, only for phase 2 (invites, emails). | Keeps the MVP on minimal infrastructure. |
| Hosting | **Firebase App Hosting** | Native Next.js support (SSR + dynamic routes), GitHub-connected deploys. Needs the Blaze plan, which has a free tier. |
| Validation | **Zod** in the client, and the same rules again in Firestore rules | |
| UI | **Tailwind CSS + shadcn/ui** (Radix) | Dialog, Sheet, Switch, Checkbox, Slider and Toast out of the box. |
| Forms | **react-hook-form** + zod resolver | |
| Dates | **date-fns** | Countdown and formatting. |
| IDs | **nanoid** (10 chars, custom alphabet) | Wedding document ID = URL segment. |
| Tests | **Vitest**, **@firebase/rules-unit-testing**, **Playwright**, all run against the **Firebase Emulator Suite** | |

> Alternative hosting: Vercel (frontend) with Firebase (Auth + Firestore). It works the same
> way. App Hosting is the default here so everything lives in one Firebase project.

---

## 3. Domain Model

### Ownership & split semantics

```
owner = GROOM   → groom pays 100%
owner = BRIDE   → bride pays 100%
owner = SHARED  → groom pays groomShareBp / 10000, bride pays the rest
```

- The ratio is stored as **basis points** (`groomShareBp`, 0–10000). Bride's share is always
  `10000 - groomShareBp`, so the two shares always add up to 100%.
- The UI shows it as `60 : 40`, with a slider and two linked number inputs.
- Rounding: `groomPortion = round(cost * bp / 10000)` and `bridePortion = cost - groomPortion`.
  No cent is ever lost or created.
- `groomShareBp` is kept when the owner changes away from SHARED. Switching back restores the
  previous ratio.

### Money
- Stored as **integer minor units** (cents) in a Firestore number field. Firestore integers are
  64-bit and JS numbers are exact up to 2^53, which is more than enough.
- Each wedding has a `currency` (ISO 4217, default `LKR`). Display uses `Intl.NumberFormat`.

### Firestore collections

```
weddings/{weddingId}                      weddingId = nanoid(10) = URL segment
  name                 string             "Hansa & Nimali's Wedding"
  groomName            string
  brideName            string
  weddingDate          timestamp
  currency             string             "LKR"
  defaultGroomShareBp  int                5000
  targetBudgetMinor    int | null         optional cap (nice-to-have)
  ownerId              string             uid of creator
  memberIds            string[]           [ownerId, partnerUid…], used for "my weddings" + rules
  createdAt, updatedAt timestamp          serverTimestamp()

weddings/{weddingId}/items/{itemId}       itemId = auto ID
  name                 string
  category             string | null      free text w/ suggestions: Venue, Catering, Attire…
  owner                "GROOM" | "BRIDE" | "SHARED"
  groomShareBp         int                0..10000, used when owner = SHARED
  costMinor            int                >= 0
  groomPortionMinor    int                derived; stored so totals can be computed with sum()
  bridePortionMinor    int                derived; groomPortion + bridePortion == costMinor
  isPaid               bool
  isEnabled            bool
  notes                string | null
  sortOrder            int
  createdAt, updatedAt timestamp
```

Why store the derived portions: the `/` card grid can then show totals and the groom/bride
split using Firestore **aggregation queries** (`sum('costMinor')`, `sum('groomPortionMinor')`
with `where('isEnabled','==',true)`). It doesn't have to download every item of every wedding
or run a Cloud Function. Security rules enforce
`groomPortionMinor + bridePortionMinor == costMinor`, and the client always writes the portions
through one helper, `withPortions(item)`.

### Composite indexes (`firestore.indexes.json`)
- `weddings`: `memberIds` (array-contains) + `weddingDate` (asc)
- `items` (collection): `isEnabled` + `isPaid`, used by the paid-sum aggregation

---

## 4. Budget Calculation Spec (`src/lib/budget.ts`, pure and unit-tested)

```ts
type Portion = { groom: number; bride: number };

splitItem(item): Portion
withPortions(item): item & { groomPortionMinor; bridePortionMinor }
summarize(items): {
  total, paid, remaining, percentPaid,
  groom: { total, paid, remaining },
  bride: { total, paid, remaining },
  counts: { all, enabled, disabled, paid, unpaid },
  byCategory: Array<{ category, total, paid }>,
}
```

Rules:
1. Disabled items are **skipped completely**. They count only in `counts.disabled`.
2. `paid` is the sum of costs of enabled items where `isPaid`.
3. `remaining = total - paid`.
4. Per-party totals add up exactly: `groom.total + bride.total === total`.
5. `percentPaid = total === 0 ? 0 : paid / total`.

The workspace pages subscribe to the wedding's items with `onSnapshot` and run `summarize()` in
the browser. A wedding has tens to a few hundred items, so this is cheap and always live. The
`/` cards use aggregation queries instead (§3).

Decision: disabling an item that is already paid removes it from "paid" as well. A disabled
item is outside the plan entirely. The UI shows a hint for this.

---

## 5. Auth & Access Model

Firestore rules can't tell "lists all weddings" apart from "knows this wedding's link" well
enough to keep the `/` list private without sign-in. So **Firebase Auth is in the MVP**.

- **Sign-in:** Google, with optional email link sign-in. The flow is:
  1. A signed-out user opening any route sees a sign-in screen in place. There's no redirect
     to `/`.
  2. After signing in they stay on the same URL.
- **`/`** lists the weddings where `memberIds array-contains auth.uid`.
- **`/w/{id}`** is readable and writable only by members.
- **Partner access (MVP-lite):** the owner shares the wedding URL. A non-member who opens it sees
  "Request access". The request is written to `weddings/{id}/requests/{uid}` and the owner
  approves it in Settings, which adds the uid to `memberIds`.
- **Phase 2:** email invites and roles (`OWNER | EDITOR | VIEWER`), done with a Cloud Function.

### Security rules (sketch, `firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn()      { return request.auth != null; }
    function isMember(w)     { return signedIn() && request.auth.uid in get(/databases/$(db)/documents/weddings/$(w)).data.memberIds; }
    function isOwner(w)      { return signedIn() && get(/databases/$(db)/documents/weddings/$(w)).data.ownerId == request.auth.uid; }

    match /weddings/{w} {
      allow get, list: if signedIn() && request.auth.uid in resource.data.memberIds;
      allow create:    if signedIn()
                       && request.resource.data.ownerId == request.auth.uid
                       && request.resource.data.memberIds == [request.auth.uid]
                       && validWedding(request.resource.data);
      allow update:    if isMember(w) && validWedding(request.resource.data)
                       && request.resource.data.ownerId == resource.data.ownerId
                       && (request.resource.data.memberIds == resource.data.memberIds || isOwner(w));
      allow delete:    if isOwner(w);

      match /items/{i} {
        allow read:           if isMember(w);
        allow create, update: if isMember(w) && validItem(request.resource.data);
        allow delete:         if isMember(w);
      }

      match /requests/{uid} {
        allow create:       if signedIn() && uid == request.auth.uid;
        allow read, delete: if isOwner(w) || (signedIn() && uid == request.auth.uid);
      }
    }

    // validWedding / validItem: field types, string lengths, 0 <= groomShareBp <= 10000,
    // costMinor >= 0, groomPortionMinor + bridePortionMinor == costMinor, owner in [...]
  }
}
```

The rules get their own test suite (§10). Both the security and the data integrity of the app
depend on them.

---

## 6. Routes & Navigation

```
/                          My weddings (cards) + "New wedding"
/w/[weddingId]             Dashboard
/w/[weddingId]/items       Budget items (list, add, edit, delete, toggles)
/w/[weddingId]/settings    Rename wedding/couple, date, currency, default ratio, members, delete
```

**Isolation rule (F3):**
- `app/w/[weddingId]/layout.tsx` renders its own shell. The header shows the wedding name and
  tabs (Dashboard · Items · Settings). It has **no link to `/`** and the wedding name is not a
  link.
- When you click a wedding card on `/`, the app navigates with `router.replace()`. The list
  page is then not in history, so the browser Back button doesn't return to it either.
- Deleting a wedding from Settings is the one action that redirects to `/`.
- An unknown or inaccessible ID shows a plain "Not found / Request access" screen with no link
  to the list.

**Rendering:** pages are thin server components that render client components. All Firestore
access is client-side through the signed-in SDK, which keeps one auth context and lets rules do
the enforcement. A `FirebaseProvider` and an `AuthGate` wrap the app.

---

## 7. UI / UX Spec

### Color system (Tailwind tokens, light & dark)

| Owner | Accent | Usage |
|-------|--------|-------|
| Groom | `sky-600` / bg `sky-50` | 4px left border on the row, badge, chart segment |
| Bride | `rose-600` / bg `rose-50` | same |
| Shared | `violet-600` / bg `violet-50` | same, plus a 2-tone split bar showing the ratio |

| State | Treatment |
|-------|-----------|
| Paid | Green check, amount shown with a muted "Paid" pill |
| Disabled | `opacity-40 grayscale`, row background `muted`, "Disabled" pill, left out of totals. Still editable and can be re-enabled. |

Colors live in one `ownerStyles` map, so they stay consistent and can be themed.

### `/`: My weddings
- A responsive grid of cards. Each card shows the name, couple, date, a short countdown
  ("124 days to go"), total and a % paid progress bar. Totals come from aggregation queries.
- "New wedding" dialog: name, groom name, bride name, date, currency and default ratio. On
  submit the app writes `weddings/{nanoid}` and `router.replace`s to `/w/{id}`.
- Empty state with a call to action. A user menu with sign-out.

### `/w/[weddingId]`: Dashboard
- **Countdown hero**: days, hours, minutes and seconds. It's a client component that ticks
  every second. On the day it shows "Today! 🎉" and after it shows "Married N days ago".
- **Stat cards**: Total budget · Paid · Remaining · % paid (with progress bar).
- **Party breakdown**: Groom and Bride columns, each with total, paid and remaining. A stacked
  bar shows the groom/bride share of the total.
- **By category**: a horizontal bar list of the top categories.
- **Counts**: items, unpaid and disabled. Each one links to the items page with that filter
  applied.
- Everything updates live through `onSnapshot`.

### `/w/[weddingId]/items`: Items
- **Toolbar**: search, owner filter chips (All / Groom / Bride / Shared), status filter
  (All / Unpaid / Paid), a "Show disabled" toggle (on by default) and an "Add item" button.
- **List**: a table on desktop and stacked cards on mobile. Each row has:
  - Paid checkbox (instant)
  - Name and category
  - Owner badge, plus a split bar and `60:40` for shared items
  - Cost, and for shared items the per-party portions in the tooltip or second line
  - Enabled switch (instant)
  - Menu: Edit · Duplicate · Delete
- **Totals footer** for the rows currently filtered (enabled only).
- **Add/Edit sheet**: name, category (combobox with common suggestions), cost, owner
  (segmented control: Groom | Bride | Shared), ratio slider (only shown for Shared, starts at the
  wedding default), notes, paid and enabled.
- **Delete**: a confirm dialog. Hard delete. Disable is the soft alternative and the dialog
  says so.
- Filters are stored in the URL search params.
- If a write is rejected (rules or network), a toast appears and Firestore rolls back the local
  change.

### `/w/[weddingId]/settings`
- Inline rename for the wedding name, groom name and bride name.
- Date/time, currency and default shared ratio.
- Members: current members and pending access requests (approve or deny). Owner only.
- Danger zone: delete wedding (type the name to confirm). The client batch-deletes `items/*`
  and `requests/*` in chunks of up to 500, then deletes the wedding doc.

---

## 8. Data Access Layer (`src/data/*`)

These are typed wrappers around the Firebase SDK. Components never call `collection()` or
`doc()` directly.

| Module | Functions |
|--------|-----------|
| `weddings.ts` | `useMyWeddings()`, `useWedding(id)`, `createWedding(input)`, `updateWedding(id, patch)`, `deleteWedding(id)`, `getWeddingCardStats(id)` (aggregations) |
| `items.ts` | `useItems(weddingId)`, `createItem(weddingId, input)`, `updateItem(weddingId, itemId, patch)`, `setItemPaid(...)`, `setItemEnabled(...)`, `deleteItem(...)` |
| `access.ts` | `requestAccess(weddingId)`, `useAccessRequests(weddingId)`, `approveRequest(...)`, `denyRequest(...)` |
| `converters.ts` | `FirestoreDataConverter`s that map `Timestamp` to `Date` and validate with Zod on read |

Every write goes through Zod and then `withPortions()`, and sets `updatedAt: serverTimestamp()`.

---

## 9. Project Structure

```
.
├── firebase.json                   # emulators, firestore, apphosting config
├── .firebaserc
├── apphosting.yaml                 # App Hosting runtime config / env
├── firestore.rules
├── firestore.indexes.json
├── scripts/seed.ts                 # seeds emulator with 1 demo wedding (~20 items)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # FirebaseProvider + AuthGate
│   │   ├── page.tsx                # my weddings
│   │   ├── not-found.tsx
│   │   └── w/[weddingId]/
│   │       ├── layout.tsx          # isolated shell + tabs (no link to /)
│   │       ├── page.tsx            # dashboard
│   │       ├── items/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn generated
│   │   ├── auth/      AuthGate, SignInScreen, UserMenu
│   │   ├── weddings/  WeddingCard, CreateWeddingDialog
│   │   ├── dashboard/ Countdown, StatCard, PartyBreakdown, CategoryBreakdown
│   │   └── items/     ItemList, ItemRow, ItemFormSheet, OwnerBadge,
│   │                  ShareRatioInput, SplitBar, ItemFilters, DeleteItemDialog
│   ├── data/                       # Firestore access layer (§8)
│   ├── firebase/
│   │   └── client.ts               # initializeApp, getAuth, initializeFirestore w/ persistent cache,
│   │                               # connect*Emulator when NEXT_PUBLIC_USE_EMULATORS=1
│   └── lib/
│       ├── budget.ts               # pure calculations
│       ├── money.ts                # parse/format minor units
│       ├── owner-styles.ts
│       ├── ids.ts                  # nanoid
│       └── validation.ts           # zod schemas
├── tests/
│   ├── unit/   budget.test.ts, money.test.ts, validation.test.ts
│   ├── rules/  firestore.rules.test.ts
│   └── e2e/    weddings.spec.ts, items.spec.ts, dashboard.spec.ts, access.spec.ts
└── .env.example                    # NEXT_PUBLIC_FIREBASE_* config, NEXT_PUBLIC_USE_EMULATORS
```

---

## 10. Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | `budget.ts` (splits, rounding, exclusions, invariants), `money.ts` (parse "1,250.50" → 125050), zod schemas |
| Property | fast-check (optional) | For random items, `groom + bride === total` and `paid ≤ total` |
| **Security rules** | `@firebase/rules-unit-testing` + Firestore emulator | Non-members can't get, list or write. A member can't change `ownerId`. Only the owner can change `memberIds` or delete. Bad items are rejected (negative cost, bp > 10000, portions ≠ cost). Users can only create a request for their own uid. |
| E2E | Playwright + Auth and Firestore emulators | The critical flows in M2–M6 at mobile and desktop viewports, plus two-browser live sync and the access-request flow |

CI (GitHub Actions) runs lint, typecheck, Vitest, `firebase emulators:exec "vitest tests/rules && playwright test"`.

---

## 11. Milestones

Each milestone ends with a mergeable PR and green CI.

### M0: Scaffold (½ day)
- `create-next-app` (TS, Tailwind, App Router, `src/`), ESLint, Prettier, shadcn init.
- Firebase project (dev + prod), `firebase init` (Firestore, Emulators, App Hosting),
  `src/firebase/client.ts` with emulator switch.
- Vitest, rules-unit-testing and Playwright configured, plus a CI workflow.
- **Done when:** `npm run dev` against the emulators serves a page and CI passes.

### M1: Domain logic, rules & data layer (1½ days)
- `lib/money.ts`, `lib/budget.ts`, `lib/validation.ts` with unit tests (rounding, ratio
  edges 0 and 10000, disabled exclusion, empty list).
- `firestore.rules`, `firestore.indexes.json` and the full rules test suite.
- `src/data/*` converters and hooks, and the seed script.
- **Done when:** unit coverage on `lib/` is ≥ 95%, all rules tests pass and the seed loads into
  the emulator.

### M2: Auth, weddings list & creation (1 day)
- Google sign-in, `AuthGate` and the user menu.
- `/` card grid with aggregation stats, empty state, create dialog → `router.replace('/w/{id}')`.
- `/w/[weddingId]/layout.tsx` isolated shell, and a not-found / no-access screen.
- **Done when:** e2e test signs in, creates a wedding, lands on its URL, finds no link to `/`,
  and browser Back doesn't return to the list. A second user can't see the wedding.

### M3: Items CRUD (1½ days)
- Items page with a live `onSnapshot` list, add/edit sheet with owner control and ratio slider,
  delete with confirm.
- Owner colors, split bar.
- **Done when:** e2e test adds groom, bride and shared (70:30) items, edits one and deletes
  one, and the list and footer totals are correct.

### M4: Paid & disable toggles (½ day)
- Instant toggles using Firestore's local writes, with a toast on rejected writes.
- Disabled styling, left out of totals, "Show disabled" filter.
- **Done when:** toggling updates the footer at once, the change persists after reload, and a
  second browser sees it live.

### M5: Dashboard (1 day)
- Countdown (renders a placeholder on the server and fills it on mount, so there's no hydration
  mismatch), stat cards, party breakdown, category breakdown, counts linking to filtered items.
- **Done when:** the dashboard numbers match `summarize()` for the seed data (e2e assertion)
  and the countdown ticks.

### M6: Settings, access requests & polish (1 day)
- Rename and edit wedding fields, change default ratio, delete wedding (batched).
- Request-access / approve flow.
- Mobile layout pass, dark mode, loading and error states, page titles.
- **Done when:** a partner can request access, be approved and edit, all e2e tests are green
  and Lighthouse mobile is ≥ 90.

### M7: Deploy (½ day)
- Upgrade the Firebase project to Blaze (needed for App Hosting) and set a budget alert.
- App Hosting backend connected to GitHub, with `main`/`master` auto-deploying to prod.
- `firebase deploy --only firestore:rules,firestore:indexes` from CI.
- Add the production domain to Auth's authorised domains.

**MVP total: about 8 working days.**

### Phase 2
- Email invites and roles (`OWNER | EDITOR | VIEWER`) using a callable Cloud Function.
- App Check (reCAPTCHA Enterprise) to block abuse of the Firestore API.
- Audit fields (`createdBy`, `updatedBy`) and an activity feed ("Nimali marked Venue as paid").

### Nice-to-haves (backlog)
- Target budget vs planned (over/under indicator).
- Partial payments / deposits (`paidMinor` instead of a boolean), plus due dates and reminders
  (FCM push).
- Vendor contact per item, receipt and quote attachments (**Cloud Storage for Firebase**).
- CSV/Excel export, printable summary.
- Drag-to-reorder, item templates ("Load a typical wedding checklist").
- Multi-currency items with FX.

---

## 12. Open Questions (defaults chosen; change if needed)

1. **Browser Back from a wedding**: default is `router.replace`, so Back does *not* return to
   the list. The alternative is to only hide in-app links and let browser Back work as usual.
2. **Sign-in providers**: default is Google only. Email link and Apple can be added later.
3. **Hosting**: default is Firebase App Hosting, which needs the Blaze plan. Vercel with
   Firebase is the alternative if you want to stay on the free Spark plan.
4. **Currency**: default `LKR`, can be changed per wedding.
5. **Disabled + paid**: default is that a disabled item is excluded from "paid" too (§4).
6. **Categories**: free text with suggestions (default), or a fixed, managed list per wedding.
