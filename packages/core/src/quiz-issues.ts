import type { QuizIssue } from './quiz.ts';

/**
 * What kind of thing an issue from `validateForPublish` (or the API's 422) is about. The editor
 * writes its own text per kind in the Interface Language, because core's messages are English.
 */
export type QuizIssueKind =
  | 'slug'
  | 'title'
  | 'description'
  | 'language'
  | 'categories'
  | 'questions'
  | 'prompt'
  | 'explanation'
  | 'options'
  | 'optionText'
  | 'other';

type Path = QuizIssue['path'];

export function quizIssueKind(path: Path): QuizIssueKind {
  const [head, , third, , fifth] = path;
  switch (head) {
    case 'slug':
    case 'title':
    case 'description':
    case 'language':
    case 'categories':
      return head;
    case 'questions':
      if (path.length === 1) return 'questions';
      if (third === 'prompt' || third === 'explanation') return third;
      if (third === 'options')
        return path.length === 3
          ? 'options'
          : fifth === 'text' || fifth === undefined
            ? 'optionText'
            : 'other';
      return 'other';
    default:
      return 'other';
  }
}

/** The form field an issue belongs to, as a React Hook Form name such as `questions.2.options`. */
export function quizIssueField(path: Path): string {
  if (path[0] === 'categories') return 'categories';
  if (path[0] === 'questions' && path[2] === 'options' && path.length === 4) {
    return [...path, 'text'].join('.');
  }
  return path.join('.');
}
