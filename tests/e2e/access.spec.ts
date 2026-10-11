import { expect, test } from '@playwright/test';
import {
  addItem,
  createWeddingViaUi,
  money,
  newUserPage,
  signIn,
  uniqueEmail,
  goTab,
} from './helpers';

test('a partner requests access, the owner approves, and the partner can edit', async ({
  page,
  browser,
}) => {
  await signIn(page, uniqueEmail('owner'));
  const { id } = await createWeddingViaUi(page);
  await goTab(page, 'Items');
  await addItem(page, { name: 'Hall', cost: '1000', owner: 'Shared' });

  const partner = await newUserPage(browser, 'partner', `/w/${id}`);
  const p = partner.page;
  await expect(p.getByRole('heading', { name: 'Wedding not found' })).toBeVisible();
  await p.getByRole('button', { name: 'Request access' }).click();
  await expect(p.getByRole('status')).toContainText('Request sent');

  // owner sees and approves the request in Settings
  await goTab(page, 'Settings');
  const requests = page.getByTestId('access-requests');
  await expect(requests).toContainText(partner.email);
  await requests.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByTestId('access-requests')).toHaveCount(0);

  // the partner is let in live, without reloading, and can edit
  await expect(p.getByTestId('wedding-title')).toBeVisible();
  await goTab(p, 'Items');
  await expect(p.getByTestId('item-row')).toHaveCount(1);
  await p
    .getByTestId('item-row')
    .getByRole('checkbox', { name: /as paid/ })
    .click();
  await goTab(page, 'Items');
  await expect(page.getByTestId('footer-paid')).toHaveText(money(100000));

  // partners can't manage members or delete the wedding
  await goTab(p, 'Settings');
  await expect(p.getByText('Only the owner can manage members.')).toBeVisible();
  await expect(p.getByRole('button', { name: 'Delete wedding' })).toHaveCount(0);
  await partner.context.close();
});

test('the owner can deny a request', async ({ page, browser }) => {
  await signIn(page, uniqueEmail('owner-deny'));
  const { id } = await createWeddingViaUi(page);
  const stranger = await newUserPage(browser, 'denied', `/w/${id}`);
  await stranger.page.getByRole('button', { name: 'Request access' }).click();
  await goTab(page, 'Settings');
  await page.getByTestId('access-requests').getByRole('button', { name: 'Deny' }).click();
  await expect(page.getByTestId('access-requests')).toHaveCount(0);
  await stranger.context.close();
});

test('settings: rename, then delete the wedding and land on the list', async ({ page }) => {
  await signIn(page, uniqueEmail('settings'));
  const { name } = await createWeddingViaUi(page);
  await goTab(page, 'Settings');

  await page.getByLabel('Wedding name').fill('Renamed Wedding');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId('wedding-title')).toHaveText('Renamed Wedding');

  await page.getByRole('button', { name: 'Delete wedding' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Delete forever' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type the wedding name to confirm').fill(name);
  await expect(confirm).toBeDisabled(); // old name no longer matches
  await dialog.getByLabel('Type the wedding name to confirm').fill('Renamed Wedding');
  await confirm.click();

  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();
});
