# Wedding Budget Planner: Implementation Plan

A multi-wedding (SaaS-style) budget planner built on **Next.js**. Each wedding gets its own
URL and a self-contained workspace. Inside a workspace you track every budget item, who pays
for it (groom, bride, or shared by a custom ratio), and whether it has been paid. A dashboard
shows totals, what's paid, what's left and a countdown to the wedding date.

---

## 1. Requirements

### Functional

| # | Requirement | Notes |
|---|-------------|-------|
| F1 | Create multiple weddings | Root page `/` lists them as cards. |
| F2 | Each wedding has its own URL | `/w/{slug}`. The slug is random and hard to guess. |
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
- Paid and enabled toggles update instantly (optimistic UI).
- No floating-point money math.
- Every query is scoped by wedding, so the app can take auth and multi-tenancy later without a rewrite.

---

## 2. Tech Stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | **Next.js 15 (App Router) + TypeScript** | Server Components for reads, Server Actions for writes, no separate API needed. |
| DB | **PostgreSQL** (Neon / Supabase in prod, Docker locally) | Relational data, cheap managed hosting. |
| ORM | **Prisma** | Typed client, migrations, seed scripts. |
| Validation | **Zod** | One schema shared by forms and server actions. |
| UI | **Tailwind CSS + shadcn/ui** (Radix) | Dialog, Sheet, Switch, Checkbox, Slider and Toast out of the box. |
| Forms | **react-hook-form** + zod resolver | |
| Dates | **date-fns** | Countdown and formatting. |
| IDs / slugs | **nanoid** (custom alphabet, 10 chars) | Unguessable wedding URLs. |
| Tests | **Vitest** (unit), **Playwright** (e2e) | |
| Hosting | **Vercel** + Neon Postgres | Zero-config deploys. |
| Auth (phase 2) | **Auth.js** (Google + email magic link) | Needed for real SaaS. |

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
- Stored as `BigInt` **minor units** (cents). `Int` would cap at about 21M in the major unit,
  and a large LKR budget can get near that.
- Converted to JS `number` at the data-access boundary. This is safe up to 2^53.
- Each wedding has a `currency` (ISO 4217, default `LKR`). Display uses `Intl.NumberFormat`.

### Prisma schema

```prisma
enum Owner {
  GROOM
  BRIDE
  SHARED
}

model Wedding {
  id                  String       @id @default(cuid())
  slug                String       @unique            // nanoid(10), used in URL
  name                String                            // "Hansa & Nimali's Wedding"
  groomName           String
  brideName           String
  weddingDate         DateTime                          // stored UTC
  currency            String       @default("LKR")
  defaultGroomShareBp Int          @default(5000)       // default split for new shared items
  targetBudgetMinor   BigInt?                           // optional cap (nice-to-have)
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  items               BudgetItem[]
  // phase 2: ownerId / members
}

model BudgetItem {
  id           String   @id @default(cuid())
  weddingId    String
  wedding      Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  name         String
  category     String?                                  // free text w/ suggestions: Venue, Catering, Attire…
  owner        Owner
  groomShareBp Int      @default(5000)                  // only used when owner = SHARED
  costMinor    BigInt   @default(0)
  isPaid       Boolean  @default(false)
  isEnabled    Boolean  @default(true)
  notes        String?
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([weddingId, sortOrder])
}
```

DB-level check constraint, added in a raw SQL migration:
`CHECK ("groomShareBp" BETWEEN 0 AND 10000)` and `CHECK ("costMinor" >= 0)`.

---

## 4. Budget Calculation Spec (`src/lib/budget.ts`, pure and unit-tested)

```ts
type Portion = { groom: number; bride: number };

splitItem(item): Portion
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

Decision: disabling an item that is already paid removes it from "paid" as well. A disabled
item is outside the plan entirely. The UI shows a hint for this.

---

## 5. Routes & Navigation

```
/                          Weddings list (cards) + "New wedding"
/w/[slug]                  Dashboard
/w/[slug]/items            Budget items (list, add, edit, delete, toggles)
/w/[slug]/settings         Rename wedding/couple, date, currency, default ratio, delete wedding
```

**Isolation rule (F3):**
- `app/w/[slug]/layout.tsx` renders its own shell. The header shows the wedding name and tabs
  (Dashboard · Items · Settings). It has **no link to `/`** and the wedding name is not a link.
- When you click a wedding card on `/`, the app navigates with `router.replace()`. The list
  page is then not in history, so the browser Back button doesn't return to it either.
  *(Open question 1)*
- Deleting a wedding from Settings is the one action that redirects to `/`.
- An unknown slug gives `notFound()` with a plain 404 page. That page has no link to the list,
  so it doesn't reveal that the list exists.

---

## 6. UI / UX Spec

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

### `/`: Weddings list
- A responsive grid of cards. Each card shows the name, couple, date, a short countdown
  ("124 days to go"), total and a % paid progress bar.
- "New wedding" dialog: name, groom name, bride name, date, currency and default ratio. On
  submit the app creates the wedding and `router.replace`s to `/w/{slug}`.
- Empty state with a call to action.

### `/w/[slug]`: Dashboard
- **Countdown hero**: days, hours, minutes and seconds. It's a client component that ticks
  every second. On the day it shows "Today! 🎉" and after it shows "Married N days ago".
- **Stat cards**: Total budget · Paid · Remaining · % paid (with progress bar).
- **Party breakdown**: Groom and Bride columns, each with total, paid and remaining. A stacked
  bar shows the groom/bride share of the total.
- **By category**: a horizontal bar list of the top categories.
- **Counts**: items, unpaid and disabled. Each one links to the items page with that filter
  applied.
- Optional: target budget vs planned total (over or under).

### `/w/[slug]/items`: Items
- **Toolbar**: search, owner filter chips (All / Groom / Bride / Shared), status filter
  (All / Unpaid / Paid), a "Show disabled" toggle (on by default) and an "Add item" button.
- **List**: a table on desktop and stacked cards on mobile. Each row has:
  - Paid checkbox (optimistic)
  - Name and category
  - Owner badge, plus a split bar and `60:40` for shared items
  - Cost, and for shared items the per-party portions in the tooltip or second line
  - Enabled switch (optimistic)
  - Menu: Edit · Duplicate · Delete
- **Totals footer** for the rows currently filtered (enabled only).
- **Add/Edit sheet**: name, category (combobox with common suggestions), cost, owner
  (segmented control: Groom | Bride | Shared), ratio slider (only shown for Shared, starts at the
  wedding default), notes, paid and enabled.
- **Delete**: a confirm dialog. Hard delete. Disable is the soft alternative and the dialog
  says so.
- Filters are stored in the URL search params, so they survive a refresh and can be shared.

### `/w/[slug]/settings`
- Inline rename for the wedding name, groom name and bride name.
- Date/time, currency and default shared ratio.
- Danger zone: delete wedding (type the name to confirm).

---

## 7. Server Layer

All mutations are **Server Actions** in `src/server/actions/*`. Each one:
1. Parses its input with Zod.
2. Resolves the wedding from `slug`, and from phase 2 also checks membership.
3. Writes through Prisma, **always filtering by `weddingId`**. Items are never looked up by
   `id` alone.
4. Calls `revalidatePath('/w/' + slug, 'layout')`.
5. Returns `{ ok: true, data } | { ok: false, error }`.

| Action | Input |
|--------|-------|
| `createWedding` | name, groomName, brideName, weddingDate, currency, defaultGroomShareBp |
| `updateWedding` | slug + partial fields |
| `deleteWedding` | slug |
| `createItem` | slug + item fields |
| `updateItem` | slug, itemId + partial fields |
| `toggleItemPaid` | slug, itemId, isPaid |
| `toggleItemEnabled` | slug, itemId, isEnabled |
| `deleteItem` | slug, itemId |
| `reorderItems` *(nice-to-have)* | slug, orderedIds |

Reads go in `src/server/queries/*` (`getWeddings`, `getWeddingBySlug`, `getItems`) and are
called from Server Components. Mappers turn `BigInt` into `number` at this boundary.

---

## 8. Project Structure

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # 1 demo wedding with ~20 realistic items
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # weddings list
│   │   ├── not-found.tsx
│   │   └── w/[slug]/
│   │       ├── layout.tsx          # isolated shell + tabs (no link to /)
│   │       ├── page.tsx            # dashboard
│   │       ├── items/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn generated
│   │   ├── weddings/  WeddingCard, CreateWeddingDialog
│   │   ├── dashboard/ Countdown, StatCard, PartyBreakdown, CategoryBreakdown
│   │   └── items/     ItemList, ItemRow, ItemFormSheet, OwnerBadge,
│   │                  ShareRatioInput, SplitBar, ItemFilters, DeleteItemDialog
│   ├── lib/
│   │   ├── budget.ts               # pure calculations (F11)
│   │   ├── money.ts                # parse/format minor units
│   │   ├── owner-styles.ts         # color tokens per owner
│   │   ├── slug.ts                 # nanoid
│   │   └── validation.ts           # zod schemas
│   └── server/
│       ├── db.ts                   # Prisma singleton
│       ├── actions/{wedding,items}.ts
│       └── queries/{wedding,items}.ts
├── tests/
│   ├── unit/   budget.test.ts, money.test.ts, validation.test.ts
│   └── e2e/    weddings.spec.ts, items.spec.ts, dashboard.spec.ts
├── docker-compose.yml              # local Postgres
└── .env.example                    # DATABASE_URL
```

---

## 9. Milestones

Each milestone ends with a mergeable PR and green CI.

### M0: Scaffold (½ day)
- `create-next-app` (TS, Tailwind, App Router, `src/`), ESLint, Prettier, shadcn init.
- Prisma + docker-compose Postgres, `.env.example`.
- Vitest + Playwright configured. GitHub Actions runs lint, typecheck, unit and e2e.
- **Done when:** `npm run dev` serves a page and CI passes.

### M1: Data layer & domain logic (1 day)
- Prisma schema, the first migration, check constraints and the seed script.
- `lib/money.ts`, `lib/budget.ts`, `lib/validation.ts`, all with unit tests (rounding, ratio
  edges 0 and 10000, disabled exclusion, empty list).
- **Done when:** unit coverage on `lib/` is ≥ 95% and the seed loads.

### M2: Weddings list & creation (1 day)
- `/` card grid, empty state, create dialog → `createWedding` → `router.replace('/w/{slug}')`.
- `/w/[slug]/layout.tsx` isolated shell, plus a 404 for unknown slugs.
- **Done when:** e2e test creates a wedding, lands on its URL, finds no link to `/`, and
  browser Back does not return to the list.

### M3: Items CRUD (1.5 days)
- Items page, add/edit sheet with owner control and ratio slider, delete with confirm.
- Owner colors, split bar.
- **Done when:** e2e test adds groom, bride and shared (70:30) items, edits one and deletes
  one, and the list and footer totals are correct.

### M4: Paid & disable toggles (½ day)
- Optimistic `useOptimistic` toggles with rollback and a toast on error.
- Disabled styling, left out of totals, "Show disabled" filter.
- **Done when:** toggling updates the footer totals at once and the change persists after
  reload.

### M5: Dashboard (1 day)
- Countdown (client, no hydration mismatch: render the placeholder on the server and fill it on
  mount), stat cards, party breakdown, category breakdown, counts linking to filtered items.
- **Done when:** the dashboard numbers match `summarize()` for the seed data (e2e assertion)
  and the countdown ticks.

### M6: Settings & polish (1 day)
- Rename and edit wedding fields, change default ratio, delete wedding.
- Filters and search in URL params, mobile layout pass, dark mode, loading and error states,
  `generateMetadata` titles.
- **Done when:** Lighthouse mobile ≥ 90 and all e2e tests are green.

### M7: Deploy (½ day)
- Neon DB, Vercel project, `prisma migrate deploy` in the build step, preview deploys per PR.

**MVP total: about 7 working days.**

### Phase 2: Real SaaS (after MVP)
- Auth.js sign-in. A `User` model and a `WeddingMember { userId, weddingId, role: OWNER|EDITOR|VIEWER }` model.
- `/` shows only the weddings the user is a member of. Invite partner by email.
- A `requireMember(slug, role)` guard in every action and query. This is one change, because of
  the scoping rule in §7.
- Rate limiting on create actions. Audit fields (`createdById`, `updatedById`).

### Nice-to-haves (backlog)
- Target budget vs planned (over/under indicator).
- Partial payments / deposits (`paidMinor` instead of a boolean), plus due dates and reminders.
- Vendor contact per item, file attachments (quotes, receipts).
- CSV/Excel export, printable summary.
- Drag-to-reorder, item templates ("Load a typical wedding checklist").
- Multi-currency items with FX.

---

## 10. Testing Strategy

| Layer | Tool | What |
|-------|------|------|
| Unit | Vitest | `budget.ts` (splits, rounding, exclusions, invariants), `money.ts` (parse "1,250.50" → 125050), zod schemas |
| Property | fast-check (optional) | For random items, `groom + bride === total` and `paid ≤ total` |
| Integration | Vitest + test Postgres | Server actions: scoping (an item from wedding A can't be changed through wedding B's slug), validation errors |
| E2E | Playwright | The critical flows in M2–M6, at mobile and desktop viewports |

---

## 11. Open Questions (defaults chosen; change if needed)

1. **Browser Back from a wedding**: default is `router.replace`, so Back does *not* return to
   the list. The alternative is to only hide in-app links and let browser Back work as usual.
2. **Access control in MVP**: default is that anyone with the `/w/{slug}` link can view and
   edit, and `/` lists all weddings. That's fine for personal use. Phase 2 adds login. If the
   app will be public from day one, move Phase 2 into the MVP.
3. **Currency**: default `LKR`, can be changed per wedding.
4. **Disabled + paid**: default is that a disabled item is excluded from "paid" too (§4).
5. **Categories**: free text with suggestions (default), or a fixed, managed list per wedding.
