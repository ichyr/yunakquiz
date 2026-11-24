import type { Messages } from './uk.ts';

export const en: Messages = {
  app: {
    name: 'Yunakquiz',
    tagline: 'Quizzes that teach through Explanations',
  },
  interfaceLanguage: {
    label: 'Interface language',
    uk: 'Українська',
    en: 'English',
  },
  search: {
    label: 'Search Quizzes',
    placeholder: 'Quiz title or description',
    submit: 'Search',
    title: 'Search',
    resultsFor: 'Results for “{{query}}”',
    noResults: 'Nothing found. Try other words.',
    blank: 'Enter a Quiz title or description to search.',
  },
  home: {
    title: 'Find a Quiz',
    categories: 'Categories',
    noCategories: 'There are no Quizzes yet.',
  },
  category: {
    noQuizzes: 'This Category has no Quizzes yet.',
  },
  quizLanguage: {
    label: 'Quiz Language: {{language}}',
  },
  attempt: {
    question: 'Question {{number}} of {{total}}',
    progress: '{{answered}} of {{total}} answered',
    finish: 'Finish',
    finishHint: 'Answer every Question to finish.',
  },
  leave: {
    title: 'Leave this Quiz?',
    description: 'Your answers will be discarded.',
    stay: 'Stay',
    leave: 'Leave',
  },
  review: {
    title: 'Review',
    score: 'Score',
    perfect: 'Every answer is correct!',
    keepLearning: 'Read the Explanations and try again.',
    correct: 'Correct',
    incorrect: 'Incorrect',
    yourAnswer: 'Your answer',
    correctOption: 'Correct Option',
    explanation: 'Explanation',
    tryAgain: 'Try again',
  },
  status: {
    loading: 'Loading…',
    errorTitle: 'Something went wrong',
    errorDescription: 'Could not load the data. Check your connection and try again.',
    retry: 'Retry',
    notFoundDescription: 'The link may be out of date or mistyped.',
    quizNotFound: 'Quiz not found',
    categoryNotFound: 'Category not found',
    pageNotFound: 'Page not found',
    goHome: 'Go to Home',
    offlineTitle: 'You are offline',
    offlineDescription: 'Loading will resume as soon as you are back online.',
  },
};
