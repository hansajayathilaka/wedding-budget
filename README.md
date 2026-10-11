# Wedding Budget Planner

A multi-wedding budget planner. Every wedding has its own URL (`/w/{id}`) and an isolated
workspace where you track items, who pays (groom, bride or a custom shared ratio), what is paid,
and what is left, with a live countdown to the day.

Built with Next.js 15 (App Router), TypeScript, Tailwind, Firebase Auth + Firestore.
The full design is in [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Local development

Requires Node 22 and Java 21+ (for the Firebase emulators).

```bash
npm install
cp .env.example .env.local      # NEXT_PUBLIC_USE_EMULATORS=1 is the default
npm run emulators               # terminal 1: Auth + Firestore emulators (UI on :4000)
npm run seed                    # terminal 2: demo user + demo wedding (demo@example.com)
npm run dev                     # terminal 2: http://localhost:3000
```

The sign-in screen offers Google and email + password (sign in, create account, forgot
password). Against the emulators you can simply create an account with any email, so no Google
account is needed locally. The seeded demo user is `demo@example.com` / `emulator-password`.
Open `/w/demo234567` after seeding.

## Scripts

| Script                        | What it does                                                     |
| ----------------------------- | ---------------------------------------------------------------- |
| `npm run lint`                | ESLint (Next config)                                             |
| `npm run typecheck`           | `tsc --noEmit`                                                   |
| `npm test`                    | Vitest unit tests for `src/lib` (`test:coverage` enforces ≥ 95%) |
| `npm run test:rules:emulated` | Firestore security-rules tests, starts the emulator for you      |
| `npm run test:e2e:emulated`   | Playwright (mobile + desktop), starts the emulators for you      |
| `npm run build`               | Production build                                                 |

Playwright needs a Chromium: `npx playwright install chromium`, or point
`PW_CHROMIUM_PATH` at an existing binary.

## Layout

```
src/lib/        pure, unit-tested logic: money, budget summary, filters, countdown, validation
src/data/       typed Firestore access layer (hooks + writes), the only place that touches the SDK
src/firebase/   client init (persistent cache, emulator switch)
src/components/ UI: auth, weddings list, workspace shell, dashboard, items, settings
firestore.rules security rules; tested in tests/rules
tests/          unit/, rules/, e2e/
```

Key rules from the plan: money is integer minor units; disabled items are excluded from every
total including "paid"; the wedding workspace has no link back to `/` and opening a wedding uses
`router.replace` so Back doesn't return to the list.

## Deploying (M7)

The step-by-step commands (rules and indexes, Blaze and budget alert, App Hosting backend,
authorized domains, the deploy pipeline, rollback) are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
Pushes to `master` deploy automatically through `.github/workflows/deploy.yml` (CI → rules and
indexes → App Hosting rollout) once the one-time setup in section 6 is done.
The Firebase project is `wedding-55c03`; its web config is already in `apphosting.yaml`. For
local dev against the real project instead of the emulators, put the same values in `.env.local`
with `NEXT_PUBLIC_USE_EMULATORS=0`.
