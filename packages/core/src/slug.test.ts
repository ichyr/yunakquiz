import { describe, expect, it } from 'vitest';
import { draftQuizSchema } from './quiz.ts';
import { slugCandidate, slugFromTitle } from './slug.ts';

describe('slugFromTitle', () => {
  it('transliterates Ukrainian by the official 2010 table', () => {
    expect(slugFromTitle('Іван Богун')).toBe('ivan-bohun');
    expect(slugFromTitle('Ґанок')).toBe('ganok');
    expect(slugFromTitle('Щука і ялина')).toBe('shchuka-i-yalyna');
  });

  it('spells є, ї, й, ю, я by position in the word', () => {
    expect(slugFromTitle('Єнот')).toBe('yenot');
    expect(slugFromTitle('Заєць')).toBe('zaiets');
    expect(slugFromTitle('Їжак')).toBe('yizhak');
    expect(slugFromTitle('Київ')).toBe('kyiv');
    expect(slugFromTitle('Йорж')).toBe('yorzh');
    expect(slugFromTitle('Юрій')).toBe('yurii');
    expect(slugFromTitle('Ярема')).toBe('yarema');
    expect(slugFromTitle('Мая')).toBe('maia');
  });

  it('writes зг as zgh and drops the soft sign and apostrophes', () => {
    expect(slugFromTitle('Згода')).toBe('zghoda');
    expect(slugFromTitle("Зв'язок")).toBe('zviazok');
    expect(slugFromTitle('Мільйон')).toBe('milion');
  });

  it('keeps Latin letters and digits, turns the rest into single hyphens', () => {
    expect(slugFromTitle('  Knots: Level 2!  ')).toBe('knots-level-2');
    expect(slugFromTitle('Вузли --- 101')).toBe('vuzly-101');
  });

  it('gives an empty string when nothing is usable', () => {
    expect(slugFromTitle('!!!')).toBe('');
    expect(slugFromTitle('')).toBe('');
  });

  it('always yields a slug the draft schema accepts, and a bounded one', () => {
    const slug = slugFromTitle('Дуже довга назва '.repeat(30));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(draftQuizSchema.shape.slug.safeParse(slug).success).toBe(true);
  });
});

describe('slugCandidate', () => {
  it('is the base first, then base-2, base-3 ...', () => {
    expect(slugCandidate('ivan-bohun', 1)).toBe('ivan-bohun');
    expect(slugCandidate('ivan-bohun', 2)).toBe('ivan-bohun-2');
    expect(slugCandidate('ivan-bohun', 10)).toBe('ivan-bohun-10');
  });

  it('keeps the suffix when the base is at the length limit', () => {
    const base = slugFromTitle('a'.repeat(200));
    const candidate = slugCandidate(base, 12);
    expect(candidate.endsWith('-12')).toBe(true);
    expect(candidate.length).toBeLessThanOrEqual(80);
  });
});
