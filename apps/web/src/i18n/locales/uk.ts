export const uk = {
  app: {
    name: 'Yunakquiz',
    tagline: 'Вікторини, що навчають поясненнями',
  },
  interfaceLanguage: {
    label: 'Мова інтерфейсу',
    uk: 'Українська',
    en: 'English',
  },
  search: {
    label: 'Пошук вікторин',
    placeholder: 'Назва або опис вікторини',
    submit: 'Шукати',
    title: 'Пошук',
    resultsFor: 'Результати за запитом «{{query}}»',
    noResults: 'Нічого не знайдено. Спробуйте інші слова.',
    blank: 'Введіть назву або опис вікторини, щоб почати пошук.',
  },
  home: {
    title: 'Знайдіть вікторину',
    categories: 'Категорії',
    noCategories: 'Поки що немає жодної вікторини.',
  },
  category: {
    noQuizzes: 'У цій категорії ще немає вікторин.',
  },
  quizLanguage: {
    label: 'Мова вікторини: {{language}}',
  },
  attempt: {
    question: 'Питання {{number}} з {{total}}',
    progress: 'Відповіді: {{answered}} з {{total}}',
    finish: 'Завершити',
    finishHint: 'Дайте відповідь на всі питання, щоб завершити.',
  },
  leave: {
    title: 'Покинути вікторину?',
    description: 'Ваші відповіді не збережуться.',
    stay: 'Залишитися',
    leave: 'Покинути',
  },
  review: {
    title: 'Розбір',
    score: 'Правильних відповідей',
    perfect: 'Усі відповіді правильні!',
    keepLearning: 'Прочитайте пояснення і спробуйте ще раз.',
    correct: 'Правильно',
    incorrect: 'Неправильно',
    yourAnswer: 'Ваша відповідь',
    correctOption: 'Правильна відповідь',
    explanation: 'Пояснення',
    tryAgain: 'Спробувати ще раз',
  },
  status: {
    loading: 'Завантаження…',
    errorTitle: 'Щось пішло не так',
    errorDescription: 'Не вдалося завантажити дані. Перевірте з’єднання і спробуйте ще раз.',
    retry: 'Спробувати знову',
    notFoundDescription: 'Можливо, посилання застаріло або містить помилку.',
    quizNotFound: 'Вікторину не знайдено',
    categoryNotFound: 'Категорію не знайдено',
    pageNotFound: 'Сторінку не знайдено',
    goHome: 'На головну',
  },
};

export type Messages = typeof uk;
