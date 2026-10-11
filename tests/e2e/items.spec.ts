import { expect, test } from '@playwright/test';
import { addItem, createWeddingViaUi, money, signIn, uniqueEmail, goTab } from './helpers';

test.describe('items', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, uniqueEmail('items'));
    await createWeddingViaUi(page);
    await goTab(page, 'Items');
    await expect(page.getByText('No budget items yet.')).toBeVisible();
  });

  test('add groom, bride and shared (70:30) items, edit one, delete one', async ({ page }) => {
    await addItem(page, { name: 'Suit', cost: '1000', owner: 'Hansa' });
    await addItem(page, { name: 'Saree', cost: '2000', owner: 'Nimali' });
    await addItem(page, { name: 'Hall', cost: '1000', owner: 'Shared', groomPct: 70 });

    await expect(page.getByTestId('item-row')).toHaveCount(3);
    await expect(page.getByTestId('footer-total')).toHaveText(money(400000));

    // the shared row shows the split
    const hall = page.getByTestId('item-row').filter({ hasText: 'Hall' });
    await expect(hall).toContainText('70:30');
    await expect(hall).toContainText(money(70000));
    await expect(hall).toContainText(money(30000));

    // edit the suit
    await page.getByRole('button', { name: 'Actions for Suit' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Cost/).fill('1500.50');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('footer-total')).toHaveText(money(450050));

    // delete the saree (with confirmation)
    await page.getByRole('button', { name: 'Actions for Saree' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByTestId('item-row')).toHaveCount(2);
    await expect(page.getByTestId('footer-total')).toHaveText(money(250050));
  });

  test('validation: name and cost are required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add item' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Add item' }).click();
    await expect(dialog.getByText('Give the item a name')).toBeVisible();
    await expect(dialog.getByText('Enter an amount')).toBeVisible();
  });

  test('paid and disabled toggles update the footer instantly and persist', async ({ page }) => {
    await addItem(page, { name: 'Suit', cost: '1000', owner: 'Hansa' });
    await addItem(page, { name: 'Saree', cost: '2000', owner: 'Nimali' });
    const suit = page.getByTestId('item-row').filter({ hasText: 'Suit' });
    const saree = page.getByTestId('item-row').filter({ hasText: 'Saree' });

    await suit.getByRole('checkbox', { name: /as paid/ }).click();
    await expect(page.getByTestId('footer-paid')).toHaveText(money(100000));
    await expect(page.getByTestId('footer-remaining')).toHaveText(money(200000));

    // disabling removes the item from every total and dims the row
    await saree.getByRole('switch').click();
    await expect(saree).toHaveAttribute('data-enabled', 'false');
    await expect(saree).toHaveClass(/opacity-40/);
    await expect(page.getByTestId('footer-total')).toHaveText(money(100000));

    // a disabled item that is paid is also out of "paid" (D5)
    await suit.getByRole('switch').click();
    await expect(page.getByTestId('footer-paid')).toHaveText(money(0));

    await page.reload();
    await expect(page.getByTestId('item-row')).toHaveCount(2);
    await expect(page.getByTestId('footer-total')).toHaveText(money(0));

    // "Show disabled" off hides them
    await page.getByRole('switch', { name: 'Show disabled' }).click();
    await expect(page.getByTestId('item-row')).toHaveCount(0);
    expect(page.url()).toContain('disabled=hide');
  });

  test('filters: owner chips and search', async ({ page }) => {
    await addItem(page, { name: 'Suit', cost: '1000', owner: 'Hansa' });
    await addItem(page, { name: 'Saree', cost: '2000', owner: 'Nimali' });
    await page.getByRole('button', { name: 'Bride', exact: true }).click();
    await expect(page.getByTestId('item-row')).toHaveCount(1);
    await expect(page.getByTestId('footer-total')).toHaveText(money(200000));
    await page.getByRole('button', { name: 'All', exact: true }).first().click();
    await page.getByLabel('Search items').fill('suit');
    await expect(page.getByTestId('item-row')).toHaveCount(1);
    await expect(page.getByTestId('item-name')).toHaveText('Suit');
  });
});

test('live sync: a toggle in one browser shows up in the other', async ({ page, browser }) => {
  const email = uniqueEmail('live');
  await signIn(page, email);
  const { id } = await createWeddingViaUi(page);
  await goTab(page, 'Items');
  await addItem(page, { name: 'Hall', cost: '1000', owner: 'Shared' });

  // a second, independent browser signed in as the same account
  const other = await browser.newContext();
  const second = await other.newPage();
  await signIn(second, email, `/w/${id}/items`);
  await expect(second.getByTestId('item-row')).toHaveCount(1);

  await page
    .getByTestId('item-row')
    .getByRole('checkbox', { name: /as paid/ })
    .click();
  await expect(second.getByTestId('footer-paid')).toHaveText(money(100000));
  await other.close();
});
