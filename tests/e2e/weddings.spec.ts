import { expect, test } from '@playwright/test';
import {
  createWeddingViaUi,
  goTab,
  newUserPage,
  signIn,
  TEST_PASSWORD,
  uniqueEmail,
} from './helpers';

test('signed-out visitors see the sign-in screen in place, then stay on the same URL', async ({
  page,
}) => {
  await page.goto('/w/aaaaaaaaaa/items');
  await expect(page.getByRole('heading', { name: 'Wedding Budget' })).toBeVisible();
  const form = page.getByTestId('password-auth');
  await form.getByRole('tab', { name: 'Create account' }).click();
  await form.getByLabel('Email').fill(uniqueEmail('inplace'));
  await form.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Wedding not found' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/w/aaaaaaaaaa/items');
});

test('creates a wedding, lands on its URL, has no way back to the list', async ({ page }) => {
  await signIn(page, uniqueEmail('creator'));
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();

  const { id } = await createWeddingViaUi(page);
  expect(id).toMatch(/^[a-z0-9]{10}$/);

  // F3: no link to "/" anywhere in the wedding workspace, on any tab
  for (const tab of ['Dashboard', 'Items', 'Settings'] as const) {
    await goTab(page, tab);
    await expect(page.getByRole('navigation', { name: 'Wedding sections' })).toBeVisible();
    expect(await page.locator('a[href="/"]').count()).toBe(0);
  }

  // D1: Back must not lead to the list page
  await page.goBack().catch(() => undefined);
  await page.goBack().catch(() => undefined);
  await page.goBack().catch(() => undefined);
  expect(new URL(page.url()).pathname).not.toBe('/');
});

test('the wedding shows up as a card on the list and opens with replace()', async ({ page }) => {
  await signIn(page, uniqueEmail('lister'));
  const { name } = await createWeddingViaUi(page);
  await page.goto('/');
  const card = page.getByTestId('wedding-card').filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card).toContainText('days to go');
  await card.click();
  await page.waitForURL(/\/w\//);
  await expect(page.getByTestId('wedding-title')).toHaveText(name);
  await page.goBack();
  expect(new URL(page.url()).pathname).not.toBe('/');
});

test("a second user can't see someone else's wedding", async ({ page, browser }) => {
  await signIn(page, uniqueEmail('owner'));
  const { id, name } = await createWeddingViaUi(page);

  const other = await newUserPage(browser, 'other', `/w/${id}`);
  await expect(other.page.getByRole('heading', { name: 'Wedding not found' })).toBeVisible();
  await expect(other.page.getByText(name)).toHaveCount(0);
  expect(await other.page.locator('a[href="/"]').count()).toBe(0);

  // and the other user's list is empty
  await other.page.goto('/');
  await expect(other.page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();
  await other.context.close();
});
