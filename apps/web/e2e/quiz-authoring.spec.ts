import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { uk } from '../src/i18n/locales/uk.ts';
import { loginAsUser } from './auth.ts';

const editor = uk.author.editor;
const exact = { exact: true } as const;

test('an Author writes a Quiz, previews and publishes it; a Guest takes it and sees the Review', async ({
  browser,
  request,
}) => {
  const author = await loginAsUser(request);
  const suffix = randomUUID().slice(0, 8);
  const title = `Вузли ${suffix}`;
  const slug = `vuzly-${suffix}`;
  const prompt = `Який вузол з’єднує дві мотузки? (${suffix})`;
  const correct = 'Прямий вузол';
  const explanation = 'Прямий вузол з’єднує кінці однакової товщини.';

  const authorContext = await browser.newContext({ storageState: author.storageState });
  const page = await authorContext.newPage();

  await page.goto('/');
  await page.getByRole('link', { name: uk.author.nav }).click();
  await expect(page.getByRole('heading', { name: uk.author.list.title })).toBeVisible();
  await expect(page.getByText(uk.author.list.empty)).toBeVisible();
  await page.getByRole('link', { name: uk.author.list.create }).first().click();

  // Fill the form. The slug comes from the title through the generate button.
  await page.getByLabel(editor.fields.title, exact).fill(title);
  await page.getByRole('button', { name: editor.fields.generate }).click();
  await expect(page.getByLabel(editor.fields.slug, exact)).toHaveValue(slug);
  await page.getByLabel(editor.fields.description, exact).fill('Прості вузли для кожного скаута.');
  await page.getByLabel('Історія України', exact).check();
  await page.getByLabel(editor.questions.prompt, exact).fill(prompt);
  await page.getByLabel(editor.options.option.replace('{{number}}', '1'), exact).fill(correct);
  await page
    .getByLabel(editor.options.option.replace('{{number}}', '2'), exact)
    .fill('Беседковий вузол');
  await page.getByLabel(editor.options.correct.replace('{{number}}', '1'), exact).check();
  await page.getByLabel(editor.questions.explanation, exact).fill(explanation);

  // A draft saves, and the Guest cannot see it anywhere.
  await page.getByRole('button', { name: editor.actions.save, ...exact }).click();
  await expect(page).toHaveURL(`/author/quizzes/${slug}`);
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/quizzes/${slug}`);
  await expect(guestPage.getByText(uk.status.quizNotFound)).toBeVisible();
  await guestPage.goto(`/search?q=${encodeURIComponent(title)}`);
  await expect(guestPage.getByText(uk.search.noResults)).toBeVisible();
  const draftResponse = await guestPage.request.get(`/api/quizzes/${slug}`);
  expect(draftResponse.status()).toBe(404);

  // Preview shows the real Quiz screen.
  await page.getByRole('button', { name: editor.actions.preview }).click();
  await expect(page).toHaveURL(`/author/quizzes/${slug}/preview`);
  await expect(page.getByText(uk.author.preview.banner)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await page.getByRole('link', { name: uk.author.preview.edit }).click();
  await expect(page).toHaveURL(`/author/quizzes/${slug}`);

  // Publish, and the slug is locked from now on.
  await page.getByRole('button', { name: editor.actions.publish, ...exact }).click();
  await expect(page.getByText(editor.actions.published)).toBeVisible();
  await expect(page.getByLabel(editor.fields.slug, exact)).toBeDisabled();

  // The Guest finds it, takes an Attempt and sees the Review.
  await guestPage.goto(`/search?q=${encodeURIComponent(title)}`);
  await guestPage.getByRole('link', { name: new RegExp(title) }).click();
  await expect(guestPage).toHaveURL(`/quizzes/${slug}`);
  await guestPage.getByRole('radio', { name: correct, ...exact }).click();
  await guestPage.getByRole('button', { name: uk.attempt.finish }).click();
  await expect(guestPage.getByText('1 / 1', exact)).toBeVisible();
  await expect(guestPage.getByText(explanation)).toBeVisible();

  // The Author sees it in "My Quizzes" as published, and may delete it after confirming.
  await page.goto('/author/quizzes');
  await expect(
    page.getByRole('link', { name: new RegExp(`${title}.*${uk.author.list.status.published}`) }),
  ).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: editor.actions.delete }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: editor.delete.confirm }).click();
  await expect(page).toHaveURL('/author/quizzes');
  await expect(page.getByText(uk.author.list.empty)).toBeVisible();
  const goneResponse = await guestPage.request.get(`/api/quizzes/${slug}`);
  expect(goneResponse.status()).toBe(404);

  await guest.close();
  await authorContext.close();
});

test('publishing an incomplete Quiz lists what is wrong next to the fields', async ({
  browser,
  request,
}) => {
  const author = await loginAsUser(request);
  const context = await browser.newContext({ storageState: author.storageState });
  const page = await context.newPage();

  await page.goto('/author/quizzes/new');
  await page.getByLabel(editor.fields.slug, exact).fill(`chernetka-${randomUUID().slice(0, 8)}`);
  await page.getByRole('button', { name: editor.actions.publish, ...exact }).click();

  await expect(page.getByRole('alert').filter({ hasText: /\d/ }).first()).toBeVisible();
  await expect(page.getByText(editor.issues.title.replace('{{max}}', '5000'))).toBeVisible();
  await expect(page.getByText(editor.issues.options.replace('{{max}}', '10'))).toBeVisible();
  await context.close();
});

test('a Guest is told why they cannot author, and downloads no Author screens', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const authorRequests: string[] = [];
  page.on('request', (r) => {
    if (/Author(Editor|Quizzes|Preview)Page|api\/authoring/.test(r.url())) {
      authorRequests.push(r.url());
    }
  });
  await page.goto('/author/quizzes');
  await expect(page.getByText(uk.author.access.guestTitle).first()).toBeVisible();
  await expect(
    page.getByRole('alert').getByRole('link', { name: uk.author.access.login }),
  ).toBeVisible();
  expect(authorRequests).toEqual([]);
  await context.close();
});
