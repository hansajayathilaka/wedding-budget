import { expect, test } from '@playwright/test';
import { summarize } from '../../src/lib/budget';
import { DEMO_EMAIL, DEMO_WEDDING_ID, demoItems } from '../../scripts/seed-data';
import { money, signIn } from './helpers';

const expected = summarize(demoItems);

test('dashboard numbers match summarize() for the seed data', async ({ page }) => {
  await signIn(page, DEMO_EMAIL, `/w/${DEMO_WEDDING_ID}`);
  await expect(page.getByTestId('wedding-title')).toBeVisible();

  await expect(page.getByTestId('stat-total')).toHaveText(money(expected.total));
  await expect(page.getByTestId('stat-paid')).toHaveText(money(expected.paid));
  await expect(page.getByTestId('stat-remaining')).toHaveText(money(expected.remaining));
  await expect(page.getByTestId('stat-percent')).toHaveText(
    `${Math.round(expected.percentPaid * 100)}%`,
  );

  const groom = page.getByTestId('party-groom');
  await expect(groom).toContainText(money(expected.groom.total));
  await expect(groom).toContainText(money(expected.groom.remaining));
  const bride = page.getByTestId('party-bride');
  await expect(bride).toContainText(money(expected.bride.total));
  await expect(bride).toContainText(money(expected.bride.paid));

  await expect(page.getByTestId('count-all')).toContainText(String(expected.counts.enabled));
  await expect(page.getByTestId('count-unpaid')).toContainText(String(expected.counts.unpaid));
  await expect(page.getByTestId('count-disabled')).toContainText(String(expected.counts.disabled));
  await expect(page.getByText('Venue')).toBeVisible();
});

test('the countdown ticks', async ({ page }) => {
  await signIn(page, DEMO_EMAIL, `/w/${DEMO_WEDDING_ID}`);
  const countdown = page.getByTestId('countdown');
  await expect(countdown).toContainText('seconds');
  const first = await countdown.innerText();
  await expect.poll(async () => countdown.innerText(), { timeout: 5000 }).not.toBe(first);
});

test('dashboard counts link to the filtered items page', async ({ page }) => {
  await signIn(page, DEMO_EMAIL, `/w/${DEMO_WEDDING_ID}`);
  await page.getByTestId('count-disabled').click();
  await page.waitForURL(/status=disabled/);
  await expect(page.getByTestId('item-row')).toHaveCount(expected.counts.disabled);
  await expect(page.getByRole('button', { name: 'Disabled', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the home cards use aggregate totals', async ({ page }) => {
  await signIn(page, DEMO_EMAIL, '/');
  const card = page.getByTestId('wedding-card').filter({ hasText: "Hansa & Nimali's Wedding" });
  await expect(card).toContainText(money(expected.total));
  await expect(card).toContainText(`${Math.round(expected.percentPaid * 100)}% paid`);
});
