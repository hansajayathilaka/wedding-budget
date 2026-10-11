# Deployment runbook

Firebase project: **`wedding-55c03`** (set as the default in `.firebaserc`). The web app config is
already in `apphosting.yaml`; it is public client config, and access is enforced by the
Firestore rules.

Run everything from the repo root on your own machine. These commands were written against the
installed `firebase-tools` CLI and its `--help` output, but they have not been run against the
real project, so read any error message before retrying. Steps marked **Console** have no
reliable CLI equivalent.

## 0. Prerequisites

```bash
git pull origin master
npm ci
npx firebase login                      # opens a browser; skip if already logged in
npx firebase use wedding-55c03          # confirms the project, should print "Now using project..."
npx firebase projects:list              # wedding-55c03 must appear
```

Already done in the console: Authentication → **Google** provider enabled, **Firestore** database
created. Check them under _Build → Authentication → Sign-in method_ and _Build → Firestore
Database_ if the deploy below fails.

## 1. Deploy Firestore rules and indexes

Until this is done the app cannot read or write anything, and the `/` list fails without its
index.

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project wedding-55c03
```

Check it:

```bash
npx firebase firestore:indexes --project wedding-55c03     # lists the deployed indexes
```

Index builds take a minute or two. The `weddings` index (`memberIds` + `weddingDate`) is the one
the home page needs. Its status shows under _Firestore → Indexes_ (it must read **Enabled**).

The rules live in `firestore.rules` and are covered by `npm run test:rules:emulated`.
Run those tests before changing them.

## 2. Upgrade to Blaze and set a budget alert

**Console:** _Project settings → Usage and billing → Details & settings → Modify plan → Blaze_.
App Hosting requires it. Then create the alert so nothing runs away unnoticed.

```bash
gcloud auth login
gcloud billing accounts list                         # copy the ACCOUNT_ID
gcloud billing projects describe wedding-55c03       # confirms the project is linked to it

gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="wedding-budget monthly" \
  --budget-amount=10USD \
  --filter-projects=projects/wedding-55c03 \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

Adjust `10USD` to taste. A budget alert only emails you; it does not stop spending.

## 3. Create the App Hosting backend

Needs Blaze (step 2). This links the GitHub repo to the backend. The app itself is rolled out by
the deploy pipeline (step 6), not by App Hosting's own push trigger, so that rules and indexes
always go out first and only after CI has passed.

```bash
npx firebase apphosting:backends:create \
  --project wedding-55c03 \
  --backend wedding-budget \
  --primary-region us-central1 \
  --root-dir /
```

`wedding-budget` matches `backendId` in `firebase.json`. The CLI is interactive from here on:

1. It asks you to authorise the **Firebase App Hosting GitHub app**. Grant it access to
   `hansajayathilaka/wedding-budget`.
2. Pick the repository and set the **live branch** to `master`.
3. Answer **No** to "automatic rollouts". If you leave them on, every push to `master` is built
   twice (once by App Hosting, once by the pipeline) and the app can go live before the rules.
   To change it later: _App Hosting → wedding-budget → Settings → Deployment → Automatic rollouts_.

Watch the first rollout, and trigger one by hand if needed:

```bash
npx firebase apphosting:backends:list --project wedding-55c03
npx firebase apphosting:rollouts:create wedding-budget --git-branch master --project wedding-55c03
```

The backend URL is printed by `backends:list` (`https://wedding-budget--wedding-55c03.<region>.hosted.app`).
Build logs are in the _App Hosting_ page of the console.

## 4. Authorize the production domain

Google sign-in is blocked on domains Firebase doesn't know about.

**Console:** _Authentication → Settings → Authorized domains → Add domain_. Add the App Hosting
host from step 3 (e.g. `wedding-budget--wedding-55c03.us-central1.hosted.app`) and any custom
domain you attach later. `localhost` and `wedding-55c03.firebaseapp.com` are there by default.

## Hosting configuration reference

The app runs on **Firebase App Hosting** (decision D3 in the plan), which is Firebase's hosting for
Next.js: server rendering on Cloud Run, a CDN in front, and builds from GitHub. Classic Firebase
Hosting (the `hosting` block in `firebase.json`) is deliberately not used: it has no first-class
Next.js server runtime, and its `headers`/`rewrites` don't apply to App Hosting.

| What | Where | Notes |
| --- | --- | --- |
| Backend id, root dir | `firebase.json` → `apphosting` | `backendId` must match the backend you create in step 3. |
| Scaling and runtime | `apphosting.yaml` → `runConfig` | 1 vCPU, 512 MiB, scale to zero (`minInstances: 0`), at most 2 instances. |
| Environment | `apphosting.yaml` → `env` | `NEXT_PUBLIC_*` values are inlined at build time. `NEXT_PUBLIC_USE_EMULATORS` is `'0'`, so production never talks to emulators or shows the dev sign-in form. |
| Response headers | `next.config.mjs` → `headers()` | HSTS, `nosniff`, frame denial, referrer and permissions policies, and `Cross-Origin-Opener-Policy: same-origin-allow-popups`, which the Google sign-in popup needs. |

Tuning:

- **Cold starts vs cost:** `minInstances: 0` costs nothing while idle but the first request after a
  quiet period is slower. Set `minInstances: 1` in `apphosting.yaml` to keep one instance warm
  (a small monthly cost).
- **Traffic spikes:** raise `maxInstances`. The cap is also your cost ceiling.
- **No Content-Security-Policy yet:** the Firebase SDK and Next.js inline scripts make a strict CSP
  fragile. Add one later, with the Google sign-in domains allowed, and test sign-in afterwards.
- **Secrets:** nothing secret is needed today (the web config is public). If you add some, use
  Cloud Secret Manager: `firebase apphosting:secrets:set NAME` and reference it with `secret:` in
  `apphosting.yaml`.

### Custom domain

**Console:** _App Hosting → wedding-budget → Settings → Domains → Add custom domain_. Enter the
domain, then add the DNS records it shows (an `A`/`AAAA` or `CNAME`, plus a `TXT` record for
ownership) at your DNS provider. The CDN issues the TLS certificate automatically, which can take up
to an hour or so after DNS propagates.

Then add the same domain under _Authentication → Settings → Authorized domains_ (step 4). The
`authDomain` in `apphosting.yaml` stays `wedding-55c03.firebaseapp.com`: that is where the Google
sign-in popup runs, and it works from any authorized domain.

## 5. Check it end to end

1. Open the backend URL: you should see the sign-in screen (no emulator email form in
   production).
2. Sign in with Google. You land on the empty "My weddings" list.
3. Create a wedding. You should land on `/w/<10 chars>` with no link back to the list.
4. Add an item, tick it as paid, reload. The change should stick.
5. Open the same URL in a private window with another Google account. It should show
   "Wedding not found" with a **Request access** button. Approve it from _Settings_ in the first window.

If sign-in shows `auth/unauthorized-domain`, step 4 is missing the host. If the list never loads or
shows an error, check the rules and the index from step 1.

## 6. Deploy pipeline (push to `master`)

`.github/workflows/deploy.yml` deploys on every push to `master`:

```
push to master
  └─ CI (lint, typecheck, unit tests, build, rules tests, Playwright e2e)   ← same checks as PRs
       └─ Deploy (environment: production)
            1. firebase deploy --only firestore:rules,firestore:indexes
            2. firebase apphosting:rollouts:create wedding-budget --git-commit <sha>
```

If CI fails, nothing is deployed. Only one deploy runs at a time, and a running deploy is never
cancelled halfway. You can also start it from _Actions → Deploy → Run workflow_.

Until the repository variable below exists, the deploy job is skipped and only CI runs, so
merging this is safe before the setup is finished.

### One-time setup

With the [`gh` CLI](https://cli.github.com/) logged in, create a service account for the pipeline,
store its key in GitHub, and tell the workflow which project to use:

```bash
PROJECT=wedding-55c03
SA=ci-deployer
REPO=hansajayathilaka/wedding-budget

gcloud iam service-accounts create $SA --project $PROJECT --display-name "CI deployer"
for ROLE in roles/firebaserules.admin roles/datastore.indexAdmin \
            roles/firebaseapphosting.admin roles/firebase.viewer \
            roles/serviceusage.serviceUsageConsumer roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member "serviceAccount:$SA@$PROJECT.iam.gserviceaccount.com" --role $ROLE
done

gcloud iam service-accounts keys create /tmp/ci-key.json \
  --iam-account $SA@$PROJECT.iam.gserviceaccount.com

gh secret set FIREBASE_SERVICE_ACCOUNT --repo $REPO < /tmp/ci-key.json
gh variable set FIREBASE_PROJECT_ID --repo $REPO --body $PROJECT
shred -u /tmp/ci-key.json      # the key now only lives in GitHub
```

Optional:

- `gh variable set APPHOSTING_BACKEND_ID --repo $REPO --body <id>` if you named the backend
  something other than `wedding-budget`.
- **Approval gate:** _Settings → Environments → production → Required reviewers_. The deploy job
  then waits for a click after CI passes. (Private repos need a paid GitHub plan for this.)
- **Branch protection** on `master`: require the `CI / checks` and `CI / emulator-tests` checks on
  pull requests, so broken code can't reach the pipeline in the first place.

The roles above are the likely minimum. If a run fails with a permission error, it names the missing
permission: add the role that grants it. Because the key is long-lived, rotate it now and then
(`gcloud iam service-accounts keys list` / `delete`).

### Verify

1. _Actions → Deploy → Run workflow_ on `master`.
2. The run should show **CI** then **Deploy to Firebase**, with the summary
   "Deployed `<sha>` to `wedding-55c03`".
3. The build and release continue in _App Hosting → wedding-budget → Rollouts_. The new rollout
   should go live in a few minutes. Then repeat the smoke test from section 5.

## Rollback

- **App:** _App Hosting → wedding-budget → Rollouts_, pick a previous rollout and promote it, or
  revert on `master` and let the pipeline roll out the revert.
- **Rules:** `git revert` the change to `firestore.rules` and push to `master` (the pipeline
  redeploys), or repeat step 1 by hand. Previous releases are also listed in the console under
  _Firestore → Rules → History_.
