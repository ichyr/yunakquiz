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
  await page.goto('/');
  await page.getByRole('searchbox', { name: uk.search.label }).fill('Богун');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=/);
  await page.getByRole('link', { name: new RegExp(ivanBohun.title) }).click();

  await expect(page).toHaveURL(`/quizzes/${ivanBohun.slug}`);
  const finish = page.getByRole('button', { name: uk.attempt.finish });
  await expect(finish).toBeDisabled();

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
  await expect(finish).toBeDisabled();
});
