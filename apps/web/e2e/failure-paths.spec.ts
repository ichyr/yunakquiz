import { expect, test } from '@playwright/test';
import ivanBohun from '../../api/seed/ivan-bohun.ts';
import { uk } from '../src/i18n/locales/uk.ts';

test('offline shows the offline message, and loading resumes on reconnect', async ({
  page,
  context,
}) => {
  // Open Search first, so everything it needs is already loaded before going offline.
  await page.goto('/');
  const searchbox = page.getByRole('searchbox', { name: uk.search.label });
  await searchbox.fill('Богун');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: new RegExp(ivanBohun.title) })).toBeVisible();

  await context.setOffline(true);
  await searchbox.fill('Мазепа');
  await page.keyboard.press('Enter');

  await expect(page.getByText(uk.status.offlineTitle)).toBeVisible();
  await expect(page.getByRole('button', { name: uk.status.retry })).toHaveCount(0);
  await expect(page.locator('output.sr-only')).toHaveText('');

  await context.setOffline(false);

  await expect(page.getByText(uk.status.offlineTitle)).toHaveCount(0);
  await expect(page.getByText(uk.search.noResults)).toBeVisible();
});

test('an Attempt carries on offline', async ({ page, context }) => {
  await page.goto(`/quizzes/${ivanBohun.slug}`);
  const questions = page.getByRole('radiogroup');
  await expect(questions).toHaveCount(ivanBohun.questions.length);

  await context.setOffline(true);
  await questions.first().getByRole('radio').first().click();

  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(questions).toHaveCount(ivanBohun.questions.length);
  await expect(page.getByText(uk.status.offlineTitle)).toHaveCount(0);
});

test('a broken link shows not found and leads Home', async ({ page }) => {
  await page.goto('/quizzes/no-such-quiz');

  await expect(page.getByRole('alert')).toContainText(uk.status.quizNotFound);
  await page.getByRole('link', { name: uk.status.goHome }).click();

  await expect(page).toHaveURL('/');
});

test('a failed request offers a retry', async ({ page }) => {
  await page.route('**/api/categories', (route) => route.fulfill({ status: 500 }));
  await page.goto('/');

  // The query client retries three times with backoff before giving up.
  const retry = page.getByRole('button', { name: uk.status.retry });
  await expect(retry).toBeVisible({ timeout: 15_000 });

  await page.unroute('**/api/categories');
  await retry.click();

  await expect(retry).toHaveCount(0);
  await expect(page.getByRole('heading', { name: uk.home.categories })).toBeVisible();
  await expect(
    page.getByRole('link').filter({ hasText: ivanBohun.categories[0]!.name }),
  ).toBeVisible();
});

test('a screen that fails to load offers a reload', async ({ page }) => {
  await page.goto('/');
  const searchbox = page.getByRole('searchbox', { name: uk.search.label });
  await searchbox.fill('Богун');
  await page.keyboard.press('Enter');
  const quizLink = page.getByRole('link', { name: new RegExp(ivanBohun.title) });
  await expect(quizLink).toBeVisible();

  // The Quiz screen's code is fetched on demand; make that fetch fail.
  await page.route('**/QuizPage*', (route) => route.abort());
  await quizLink.click();

  const retry = page.getByRole('button', { name: uk.status.retry });
  await expect(retry).toBeVisible();

  await page.unroute('**/QuizPage*');
  await retry.click();

  await expect(page.getByRole('radiogroup')).toHaveCount(ivanBohun.questions.length);
});
