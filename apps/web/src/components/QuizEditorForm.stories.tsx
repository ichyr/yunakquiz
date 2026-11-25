import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AuthoringQuiz } from '@yunakquiz/core';
import { fn } from 'storybook/test';
import { ApiError } from '@/api/client';
import { QuizEditorForm } from './QuizEditorForm.tsx';

const categories = [
  { slug: 'istoriia-ukrainy', name: 'Історія України' },
  { slug: 'znannia', name: 'Знання' },
];

const complete: AuthoringQuiz = {
  slug: 'ivan-bohun',
  title: 'Іван Богун',
  description: 'Що ви знаєте про полковника Богуна?',
  language: 'uk',
  categories: ['istoriia-ukrainy'],
  questions: [
    {
      prompt: 'Де загинув Іван Богун?',
      options: [{ text: 'Під Кременчуком', correct: true }, { text: 'Під Корсунем' }],
      explanation: 'Богун загинув 1664 року під Кременчуком.',
    },
  ],
  status: 'draft',
  version: 1,
  authorId: 7,
  author: { displayName: 'Олена' },
  publishedAt: null,
  updatedAt: '2026-11-24T10:00:00.000Z',
};

const incomplete: AuthoringQuiz = {
  ...complete,
  slug: 'chernetka',
  title: 'Чернетка',
  description: '',
  language: '',
  categories: [],
  questions: [
    { prompt: 'Питання без відповідей', options: [{ text: 'Так' }, { text: '' }], explanation: '' },
  ],
};

const meta = {
  title: 'Author/QuizEditorForm',
  component: QuizEditorForm,
  args: {
    categories,
    isAdmin: false,
    onSave: async (draft, target) => ({
      ...complete,
      ...draft,
      version: (target?.version ?? 0) + 1,
    }),
    onPublish: async (slug, version) => ({
      ...complete,
      slug,
      version: version + 1,
      status: 'published',
    }),
    onDelete: async () => {},
    onLogin: async () => {},
    checkSlug: async () => true,
    onSaved: fn(),
    onDeleted: fn(),
    onReload: fn(),
  },
} satisfies Meta<typeof QuizEditorForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new Quiz: one blank Question, nothing saved yet. */
export const New: Story = {};
export const EditingDraft: Story = { args: { quiz: complete } };
export const EditingPublished: Story = {
  args: {
    quiz: { ...complete, status: 'published', publishedAt: '2026-11-20T10:00:00.000Z', version: 4 },
  },
};
/** Published and locked for an Author; the Admin story below can still change the address. */
export const SlugLockedAfterPublish: Story = {
  args: { quiz: { ...complete, status: 'published', publishedAt: '2026-11-20T10:00:00.000Z' } },
};
export const SlugEditableForAdmin: Story = {
  args: {
    isAdmin: true,
    quiz: { ...complete, status: 'published', publishedAt: '2026-11-20T10:00:00.000Z' },
  },
};
/** Publish lists every problem next to its field. Press Publish to see them. */
export const IncompleteDraft: Story = { args: { quiz: incomplete } };
export const NoQuestions: Story = { args: { quiz: { ...complete, questions: [] } } };
export const NoCategoriesYet: Story = { args: { categories: [] } };
/** Press Save: the API says 409 and the form offers to load the current version. */
export const Conflict: Story = {
  args: {
    quiz: complete,
    onSave: async () => {
      throw new ApiError(409, '/authoring/quizzes/ivan-bohun', {
        method: 'PUT',
        code: 'version_conflict',
        body: { error: 'version_conflict', currentVersion: 2 },
      });
    },
  },
};
/** Press Save: the session is gone; the text stays and the form offers log in and retry. */
export const SessionExpired: Story = {
  args: {
    quiz: complete,
    onSave: async () => {
      throw new ApiError(401, '/authoring/quizzes/ivan-bohun', {
        method: 'PUT',
        code: 'session_expired',
      });
    },
  },
};
/** Press Save: the server says the address is taken. */
export const SlugTakenOnSave: Story = {
  args: {
    quiz: complete,
    onSave: async () => {
      throw new ApiError(409, '/authoring/quizzes/ivan-bohun', {
        method: 'PUT',
        code: 'slug_taken',
      });
    },
  },
};
/** Press Save: any other failure. */
export const SaveFailed: Story = {
  args: {
    quiz: complete,
    onSave: async () => {
      throw new ApiError(500, '/authoring/quizzes/ivan-bohun', { method: 'PUT' });
    },
  },
};
/** Press Delete Quiz, then Delete: the API refuses. */
export const DeleteFailed: Story = {
  args: {
    quiz: complete,
    onDelete: async () => {
      throw new ApiError(403, '/authoring/quizzes/ivan-bohun', {
        method: 'DELETE',
        code: 'forbidden',
      });
    },
  },
};
