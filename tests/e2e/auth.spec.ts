import { expect, test } from '@playwright/test';
import { TEST_PASSWORD, uniqueEmail } from './helpers';

const form = (page: import('@playwright/test').Page) => page.getByTestId('password-auth');

async function fill(page: import('@playwright/test').Page, email: string, password: string) {
  await form(page).getByLabel('Email').fill(email);
  await form(page).getByLabel('Password', { exact: true }).fill(password);
}

async function signOut(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(form(page)).toBeVisible();
}

test('create an account, sign out, sign back in with the password', async ({ page }) => {
  const email = uniqueEmail('pw');
  await page.goto('/');
  await form(page).getByRole('tab', { name: 'Create account' }).click();
  await form(page).getByLabel('Your name').fill('Pat Tester');
  await fill(page, email, TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();

  await signOut(page);
  await fill(page, email, TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();
});

test('a too-short password is rejected before anything is sent', async ({ page }) => {
  await page.goto('/');
  await form(page).getByRole('tab', { name: 'Create account' }).click();
  await fill(page, uniqueEmail('short'), 'short');
  await form(page).getByRole('button', { name: 'Create account' }).click();
  await expect(form(page).getByRole('alert')).toContainText('at least 8 characters');
  await expect(form(page)).toBeVisible();
});

test('a wrong password and an unknown email give the same message', async ({ page }) => {
  const email = uniqueEmail('wrong');
  await page.goto('/');
  await form(page).getByRole('tab', { name: 'Create account' }).click();
  await fill(page, email, TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();
  await signOut(page);

  await fill(page, email, 'not-the-password');
  await form(page).getByRole('button', { name: 'Sign in' }).click();
  const wrongPassword = await form(page).getByRole('alert').innerText();
  expect(wrongPassword).toBe('Incorrect email or password.');

  await fill(page, uniqueEmail('nobody'), TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Sign in' }).click();
  await expect(form(page).getByRole('alert')).toHaveText(wrongPassword);
});

test('registering an email that already exists is explained', async ({ page }) => {
  const email = uniqueEmail('dupe');
  await page.goto('/');
  await form(page).getByRole('tab', { name: 'Create account' }).click();
  await fill(page, email, TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'No weddings yet' })).toBeVisible();
  await signOut(page);

  await form(page).getByRole('tab', { name: 'Create account' }).click();
  await fill(page, email, TEST_PASSWORD);
  await form(page).getByRole('button', { name: 'Create account' }).click();
  await expect(form(page).getByRole('alert')).toContainText('already exists');
});

test('forgot password gives a neutral confirmation, known address or not', async ({ page }) => {
  await page.goto('/');
  await form(page).getByRole('button', { name: 'Forgot password?' }).click();
  await expect(form(page).getByLabel('Password', { exact: true })).toHaveCount(0);
  await form(page).getByLabel('Email').fill(uniqueEmail('ghost'));
  await form(page).getByRole('button', { name: 'Send reset link' }).click();
  await expect(form(page).getByRole('status')).toContainText('If an account exists');
  await form(page).getByRole('button', { name: 'Back to sign in' }).click();
  await expect(form(page).getByRole('tab', { name: 'Sign in' })).toBeVisible();
});

test('the password can be revealed and hidden', async ({ page }) => {
  await page.goto('/');
  const input = form(page).getByLabel('Password', { exact: true });
  await expect(input).toHaveAttribute('type', 'password');
  await form(page).getByRole('button', { name: 'Show password' }).click();
  await expect(input).toHaveAttribute('type', 'text');
});
