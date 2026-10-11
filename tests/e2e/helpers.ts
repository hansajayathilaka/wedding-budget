import { expect, type Browser, type Page } from '@playwright/test';
import { formatMoney } from '../../src/lib/money';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../scripts/seed-data';

export const money = (minor: number) => formatMoney(minor, 'LKR');

export function uniqueEmail(tag = 'user') {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const TEST_PASSWORD = 'Password-1234';

/** The seeded demo user has its own password (see scripts/seed-data.ts). */
export const passwordFor = (email: string) =>
  email === DEMO_EMAIL ? DEMO_PASSWORD : TEST_PASSWORD;

/**
 * Gets into the app through the real email/password form. Fresh emails go through "Create
 * account"; if the account already exists (re-sign-in, seeded user) it falls back to "Sign in".
 */
export async function signIn(page: Page, email: string, path = '/') {
  await page.goto(path);
  const form = page.getByTestId('password-auth');
  const password = passwordFor(email);

  await form.getByRole('tab', { name: 'Create account' }).click();
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await form.getByRole('button', { name: 'Create account' }).click();

  const exists = form.getByRole('alert').filter({ hasText: 'already exists' });
  // wait until we're either in the app or told the account exists
  await expect(async () => {
    const gone = (await form.count()) === 0;
    const taken = await exists.isVisible();
    expect(gone || taken).toBe(true);
  }).toPass();

  if ((await form.count()) > 0) {
    await form.getByRole('tab', { name: 'Sign in' }).click();
    await form.getByLabel('Email').fill(email);
    await form.getByLabel('Password', { exact: true }).fill(password);
    await form.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByTestId('password-auth')).toBeHidden();
}

export async function newUserPage(browser: Browser, tag: string, path = '/') {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = uniqueEmail(tag);
  await signIn(page, email, path);
  return { page, context, email };
}

/** Creates a wedding through the UI and returns its id (taken from the URL). */
export async function createWeddingViaUi(page: Page, opts: { name?: string } = {}) {
  const name = opts.name ?? `Wedding ${Math.random().toString(36).slice(2, 7)}`;
  const empty = page.getByRole('button', { name: 'New wedding' }).first();
  await empty.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Wedding name').fill(name);
  await dialog.getByLabel('Groom', { exact: true }).fill('Hansa');
  await dialog.getByLabel('Bride', { exact: true }).fill('Nimali');
  await dialog.getByRole('button', { name: 'Create wedding' }).click();
  await page.waitForURL(/\/w\/[a-z0-9]{10}$/);
  await expect(page.getByTestId('wedding-title')).toHaveText(name);
  return { id: page.url().split('/w/')[1], name };
}

export async function addItem(
  page: Page,
  item: { name: string; cost: string; owner: 'Hansa' | 'Nimali' | 'Shared'; groomPct?: number },
) {
  await page.getByRole('button', { name: 'Add item' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(item.name);
  await dialog.getByLabel(/^Cost/).fill(item.cost);
  await dialog.getByRole('radio', { name: item.owner }).click();
  if (item.owner === 'Shared' && item.groomPct != null) {
    await dialog.getByLabel('Hansa share percent').fill(String(item.groomPct));
  }
  await dialog.getByRole('button', { name: 'Add item' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('item-name').filter({ hasText: item.name })).toBeVisible();
}

export async function goTab(page: Page, name: 'Dashboard' | 'Items' | 'Settings') {
  await page
    .getByRole('navigation', { name: 'Wedding sections' })
    .getByRole('link', { name })
    .click();
}
