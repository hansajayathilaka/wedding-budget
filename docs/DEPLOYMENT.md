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

Needs Blaze (step 2). This links the GitHub repo and deploys on every push to `master`.

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
3. Keep automatic rollouts enabled.

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

## 6. Optional: deploy rules from CI

`.github/workflows/deploy-rules.yml` redeploys the rules and indexes whenever they change on
`master`. It needs a service account key and a project variable. With the
[`gh` CLI](https://cli.github.com/) logged in:

```bash
PROJECT=wedding-55c03
SA=ci-rules-deployer

gcloud iam service-accounts create $SA --project $PROJECT --display-name "CI rules deployer"
for ROLE in roles/firebaserules.admin roles/datastore.indexAdmin \
            roles/firebase.viewer roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $PROJECT \
    --member "serviceAccount:$SA@$PROJECT.iam.gserviceaccount.com" --role $ROLE
done

gcloud iam service-accounts keys create /tmp/ci-key.json \
  --iam-account $SA@$PROJECT.iam.gserviceaccount.com

gh secret set FIREBASE_SERVICE_ACCOUNT --repo hansajayathilaka/wedding-budget < /tmp/ci-key.json
gh variable set FIREBASE_PROJECT_ID --repo hansajayathilaka/wedding-budget --body $PROJECT
shred -u /tmp/ci-key.json   # the key now only lives in GitHub
```

If the workflow later fails with a permission error, the message names the missing permission:
add the role that grants it. Test it with _Actions → Deploy Firestore rules → Run workflow_.

## Rollback

- **App:** _App Hosting → wedding-budget → Rollouts_, pick a previous rollout and promote it, or
  revert on `master` and let the automatic rollout run.
- **Rules:** `git revert` the change to `firestore.rules`, then repeat step 1. Previous releases are
  also listed in the console under _Firestore → Rules → History_.
