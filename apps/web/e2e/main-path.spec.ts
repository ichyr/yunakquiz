import { expect, test } from '@playwright/test';
import { correctOptionIndex } from '@yunakquiz/core';
import ivanBohun from '../../api/seed/ivan-bohun.ts';
import { uk } from '../src/i18n/locales/uk.ts';

// The seed file is the answer key: Questions and Options are shuffled on every Attempt.
const correctOptionByPrompt = new Map(
  ivanBohun.questions.map((question) => [
    question.prompt,
    question.options[correctOptionIndex(question)]!.text,
  ]),
);

test('search, take a Quiz, see the Review, try again', async ({ page }) => {
  const appName = uk.app.name;
  await page.goto('/');
  await expect(page).toHaveTitle(appName);
  await page.getByRole('searchbox', { name: uk.search.label }).fill('Богун');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page).toHaveTitle(`Богун · ${appName}`);

  await expect(page.getByRole('link', { name: new RegExp(ivanBohun.title) })).toBeVisible();
  const searchbox = page.getByRole('searchbox', { name: uk.search.label });
  await searchbox.fill('Мазепа');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/q=%D0%9C/);
  await expect(searchbox).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/q=%D0%91/);
  await expect(searchbox).toHaveValue('Богун');

  await page.getByRole('link', { name: new RegExp(ivanBohun.title) }).click();

  await expect(page).toHaveURL(`/quizzes/${ivanBohun.slug}`);
  await expect(page).toHaveTitle(`${ivanBohun.title} · ${appName}`);
  const finish = page.getByRole('button', { name: uk.attempt.finish });
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
  await expect(finish).not.toHaveAttribute('disabled');
  await expect(finish).toHaveAccessibleDescription(uk.attempt.finishHint);
  // Playwright treats aria-disabled as not enabled, so force the pointer click.
  await finish.click({ force: true });
  await finish.focus();
  await page.keyboard.press('Enter');
  await expect(finish).toBeFocused();
  await expect(page.getByRole('radiogroup')).not.toHaveCount(0);

  const questions = page.getByRole('radiogroup');
  await expect(questions).toHaveCount(ivanBohun.questions.length);
  for (const question of await questions.all()) {
    const prompt = await question
      .getAttribute('aria-labelledby')
      .then((id) => page.locator(`[id="${id}"]`).innerText());
    const correct = correctOptionByPrompt.get(prompt);
    if (!correct) throw new Error(`No Correct Option in the seed for "${prompt}"`);
    await question.getByRole('radio', { name: correct, exact: true }).click();
  }

  await finish.click();

  const total = ivanBohun.questions.length;
  await expect(page).toHaveURL(`/quizzes/${ivanBohun.slug}`);
  await expect(page.getByText(`${total} / ${total}`, { exact: true })).toBeVisible();
  await expect(page.getByText(uk.review.perfect)).toBeVisible();
  await expect(page).toHaveTitle(`${ivanBohun.title} · ${appName}`);
  await expect(
    page.getByRole('heading', { name: `${uk.review.title} · ${uk.review.score}` }),
  ).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByText(uk.review.explanation, { exact: true })).toHaveCount(total);

  await page.getByRole('button', { name: uk.review.tryAgain }).first().click();

  await expect(page).toHaveURL(`/quizzes/${ivanBohun.slug}`);
  await expect(questions).toHaveCount(total);
  await expect(page.getByRole('heading', { level: 1, name: ivanBohun.title })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
});
