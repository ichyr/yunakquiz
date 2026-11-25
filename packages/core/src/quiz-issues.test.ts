import { describe, expect, it } from 'vitest';
import { quizIssueField, quizIssueKind } from './quiz-issues.ts';

describe('quizIssueKind', () => {
  it.each([
    [['slug'], 'slug'],
    [['title'], 'title'],
    [['description'], 'description'],
    [['language'], 'language'],
    [['categories'], 'categories'],
    [['categories', 2], 'categories'],
    [['questions'], 'questions'],
    [['questions', 3, 'prompt'], 'prompt'],
    [['questions', 3, 'explanation'], 'explanation'],
    [['questions', 3, 'options'], 'options'],
    [['questions', 3, 'options', 1, 'text'], 'optionText'],
    [['questions', 3, 'options', 1], 'optionText'],
    [[], 'other'],
    [['nonsense'], 'other'],
  ] as const)('classifies %j as %s', (path, kind) => {
    expect(quizIssueKind([...path])).toBe(kind);
  });
});

describe('quizIssueField', () => {
  it('joins the path into a form field name', () => {
    expect(quizIssueField(['questions', 2, 'options', 0, 'text'])).toBe(
      'questions.2.options.0.text',
    );
  });

  it('points a Question-level Options issue at the group, not a single Option', () => {
    expect(quizIssueField(['questions', 2, 'options'])).toBe('questions.2.options');
  });

  it('points a bare Option issue at its text', () => {
    expect(quizIssueField(['questions', 2, 'options', 1])).toBe('questions.2.options.1.text');
  });

  it('points a Category issue at the Category list', () => {
    expect(quizIssueField(['categories', 1])).toBe('categories');
  });
});
