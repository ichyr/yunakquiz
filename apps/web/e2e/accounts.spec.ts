import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { waitForMail } from '../../api/test/mail.ts';
import { uk } from '../src/i18n/locales/uk.ts';
import { loginAsAdmin, loginAsUser } from './auth.ts';

// Accounts through the real forms. Mail is read from LocalStack SES (`pnpm db:up`).

test('register, confirm the address from the mail, log in', async ({ page }) => {
  const id = randomUUID();
  const email = `e2e-register-${id}@example.test`;
  const displayName = `Скаут ${id.slice(0, 8)}`;
  const password = 'bright lantern over quiet harbour';

  await page.goto('/register');
  await page.getByLabel(uk.auth.email).fill(email);
  await page.getByLabel(uk.auth.displayName).fill(displayName);
  await page.getByLabel(uk.auth.password).fill(password);
  await page.getByRole('button', { name: uk.auth.register }).click();
  await expect(page.getByText(uk.auth.registerPage.sentTitle)).toBeVisible();

  const mail = await waitForMail(email, { timeoutMs: 20_000 });
  const link = /https?:\/\/\S+\/verify\?token=[\w-]+/.exec(mail.Body.text_part ?? '')?.[0];
  expect(link).toBeTruthy();
  // The mailed link points at the web app; open it on the server this test runs against.
  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await expect(page.getByText(uk.auth.verify.success)).toBeVisible();

  await page.goto('/login');
  await page.getByLabel(uk.auth.email).fill(email);
  await page.getByLabel(uk.auth.password).fill(password);
  await page.getByRole('button', { name: uk.auth.login }).click();
  await expect(page.getByText(displayName)).toBeVisible();
  await expect(page.getByRole('link', { name: uk.admin.nav })).toHaveCount(0);
});

test('reset a forgotten password from the mail, then log in with the new one', async ({
  page,
  request,
}) => {
  const user = await loginAsUser(request);
  const newPassword = 'copper river under pale morning sky';

  await page.goto('/login');
  await page.getByRole('link', { name: uk.passwordReset.forgotLink }).click();
  await expect(page.getByRole('heading', { name: uk.passwordReset.requestTitle })).toBeVisible();
  await page.getByLabel(uk.auth.email).fill(user.email);
  await page.getByRole('button', { name: uk.passwordReset.requestSubmit }).click();
  await expect(page.getByText(uk.passwordReset.sentTitle)).toBeVisible();

  const mail = await waitForMail(user.email, { timeoutMs: 20_000 });
  const link = /https?:\/\/\S+\/reset-password\?token=[\w-]+/.exec(mail.Body.text_part ?? '')?.[0];
  expect(link).toBeTruthy();
  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await page.getByLabel(uk.passwordReset.newPassword).fill(newPassword);
  await page.getByRole('button', { name: uk.passwordReset.completeSubmit }).click();
  await expect(page.getByText(uk.passwordReset.doneTitle)).toBeVisible();

  await page.getByRole('status').getByRole('link', { name: uk.auth.login }).click();
  await page.getByLabel(uk.auth.email).fill(user.email);
  await page.getByLabel(uk.auth.password).fill(newPassword);
  await page.getByRole('button', { name: uk.auth.login }).click();
  await expect(page.getByText(user.displayName)).toBeVisible();
});

test('change the display name in the account settings', async ({ browser, request }) => {
  const user = await loginAsUser(request);
  const context = await browser.newContext({ storageState: user.storageState });
  const page = await context.newPage();
  const newName = `Пластун ${randomUUID().slice(0, 8)}`;

  await page.goto('/account');
  await page.getByLabel(uk.auth.displayName).fill(newName);
  await page.getByRole('button', { name: uk.account.displayName.submit }).click();
  await expect(page.getByText(uk.account.displayName.saved)).toBeVisible();

  await page.goto('/');
  await expect(page.getByText(newName)).toBeVisible();
  await expect(page.getByText(user.displayName)).toHaveCount(0);
  await context.close();
});

test('an Admin promotes a User, then deletes them', async ({ browser, request }) => {
  const admin = await loginAsAdmin(request);
  const user = await loginAsUser(request);
  const context = await browser.newContext({ storageState: admin.storageState });
  const page = await context.newPage();

  await page.goto('/');
  await page.getByRole('link', { name: uk.admin.nav }).click();
  await expect(page.getByRole('heading', { name: uk.admin.title })).toBeVisible();

  await page.getByRole('searchbox', { name: uk.admin.search.label }).fill(user.displayName);
  await page.keyboard.press('Enter');
  const row = page.getByRole('row', { name: new RegExp(user.displayName) });
  await expect(row).toBeVisible();
  await expect(row.getByRole('cell', { name: uk.admin.roles.user, exact: true })).toBeVisible();

  // Promote: asks first, and Cancel changes nothing.
  await row
    .getByRole('button', {
      name: uk.admin.actions.promoteFor.replace('{{name}}', user.displayName),
    })
    .click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: uk.admin.confirm.cancel }).click();
  await expect(row.getByRole('cell', { name: uk.admin.roles.user, exact: true })).toBeVisible();

  await row
    .getByRole('button', {
      name: uk.admin.actions.promoteFor.replace('{{name}}', user.displayName),
    })
    .click();
  await dialog.getByRole('button', { name: uk.admin.confirm.promote }).click();
  await expect(row.getByRole('cell', { name: uk.admin.roles.admin, exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: uk.admin.actions.demote })).toBeVisible();

  // Delete: the Account is gone from the list.
  await row
    .getByRole('button', { name: uk.admin.actions.deleteFor.replace('{{name}}', user.displayName) })
    .click();
  await dialog.getByRole('button', { name: uk.admin.confirm.delete }).click();
  await expect(page.getByText(uk.admin.empty)).toBeVisible();

  await context.close();
});

test('Guests and Users see no access and never download the Admin screens', async ({
  browser,
  request,
}) => {
  const user = await loginAsUser(request);
  for (const storageState of [undefined, user.storageState]) {
    const context = await browser.newContext(storageState ? { storageState } : {});
    const page = await context.newPage();
    const adminChunks: string[] = [];
    page.on('request', (r) => {
      if (/AdminUsersPage|api\/admin/.test(r.url())) adminChunks.push(r.url());
    });
    await page.goto('/admin/users');
    await expect(page.getByText(uk.admin.forbiddenTitle).first()).toBeVisible();
    expect(adminChunks).toEqual([]);
    await context.close();
  }
});
