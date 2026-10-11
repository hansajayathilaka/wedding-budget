import { expect, type Browser, type Page } from '@playwright/test';
import { formatMoney } from '../../src/lib/money';

export const money = (minor: number) => formatMoney(minor, 'LKR');

export function uniqueEmail(tag = 'user') {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Signs in through the emulator-only email form shown on the sign-in screen. */
export async function signIn(page: Page, email: string, path = '/') {
  await page.goto(path);
  await page.getByLabel('Emulator email').fill(email);
  await page.getByRole('button', { name: 'Sign in with email' }).click();
  await expect(page.getByTestId('dev-sign-in')).toBeHidden();
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
