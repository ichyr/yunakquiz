import { zodResolver } from '@hookform/resolvers/zod';
import {
  draftQuizSchema,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MAX_TEXT_LENGTH,
  quizIssueField,
  validateForPublish,
  type AuthoringQuiz,
  type Category,
  type DraftQuiz,
  type DraftQuizInput,
  type LoginInput,
  type QuizIssue,
} from '@yunakquiz/core';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { invalidQuizIssues } from '@/api/authoring';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { languageName } from '@/i18n/languageName';
import { useIssueText } from '@/lib/useIssueText';
import { CategoryPicker } from './CategoryPicker.tsx';
import { ConfirmQuizDeleteDialog } from './ConfirmQuizDeleteDialog.tsx';
import { ConflictNotice } from './ConflictNotice.tsx';
import { QuestionFields } from './QuestionFields.tsx';
import { SessionExpiredNotice } from './SessionExpiredNotice.tsx';
import { SlugField } from './SlugField.tsx';

/** What the form asks its page to do. Each rejects with an `ApiError` when the API refuses. */
interface QuizEditorFormProps {
  /** The saved Quiz being edited, or nothing for a new one. */
  quiz?: AuthoringQuiz | undefined;
  categories: Pick<Category, 'slug' | 'name'>[];
  /** An Admin may change the address of a published Quiz; an Author may not. */
  isAdmin: boolean;
  /** `target` is the saved address and version, or undefined while the Quiz is new. */
  onSave: (
    draft: DraftQuiz,
    target: { slug: string; version: number } | undefined,
  ) => Promise<AuthoringQuiz>;
  onPublish: (slug: string, version: number) => Promise<AuthoringQuiz>;
  onDelete?: (slug: string) => Promise<void>;
  onLogin: (input: LoginInput) => Promise<void>;
  checkSlug: (slug: string, currentSlug: string | undefined) => Promise<boolean>;
  /** After a save that changed what the page shows (a new Quiz, a new address) or Save and preview. */
  onSaved: (quiz: AuthoringQuiz, then: 'stay' | 'preview') => void;
  onDeleted: () => void;
  /** Conflict: load the current version of the Quiz into a fresh editor. */
  onReload: () => void;
  defaultLanguage?: string;
}

type Action = 'save' | 'publish' | 'preview';
type Notice = 'conflict' | 'sessionExpired' | undefined;

const blankQuestion = () => ({
  prompt: '',
  options: [{ text: '' }, { text: '' }],
  explanation: '',
});

function defaultsFor(quiz: AuthoringQuiz | undefined, language: string): DraftQuizInput {
  if (!quiz) {
    return {
      slug: '',
      title: '',
      description: '',
      language,
      categories: [],
      questions: [blankQuestion()],
    };
  }
  return {
    slug: quiz.slug,
    title: quiz.title,
    description: quiz.description,
    language: quiz.language,
    categories: quiz.categories,
    questions: quiz.questions,
  };
}

/**
 * The whole Quiz in one form: React Hook Form, core's `draftQuizSchema` as the resolver, and
 * `useFieldArray` for Questions and Options. A draft saves with incomplete content; Publish
 * checks everything with `validateForPublish` and shows each problem next to its field. The
 * content stays in memory through a conflict or an expired session (ADR 0009).
 */
export function QuizEditorForm({
  quiz,
  categories,
  isAdmin,
  onSave,
  onPublish,
  onDelete,
  onLogin,
  checkSlug,
  onSaved,
  onDeleted,
  onReload,
  defaultLanguage = 'uk',
}: QuizEditorFormProps) {
  const { t, i18n } = useTranslation();
  const issueText = useIssueText();
  const form = useForm<DraftQuizInput, undefined, DraftQuiz>({
    resolver: zodResolver(draftQuizSchema),
    defaultValues: defaultsFor(quiz, defaultLanguage),
  });
  const questions = useFieldArray({ control: form.control, name: 'questions' });

  // What the API holds now. A save or publish updates it, so the next one sends the new version.
  const [saved, setSaved] = useState(
    quiz && {
      slug: quiz.slug,
      version: quiz.version,
      status: quiz.status,
      everPublished: quiz.publishedAt !== null,
    },
  );
  const [pending, setPending] = useState<Action>();
  const [notice, setNotice] = useState<Notice>();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string }>();
  const [issues, setIssues] = useState<QuizIssue[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const retry = useRef<Action>('save');

  const categoryNames = new Map(categories.map((category) => [category.slug, category.name]));
  const published = saved?.status === 'published';
  const slugLocked = !isAdmin && saved?.everPublished === true;

  function errorText(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === 'slug_locked') return t('author.editor.errors.slugLocked');
      if (error.code === 'unknown_category') return t('author.editor.errors.unknownCategory');
      if (error.status === 403) return t('author.editor.errors.forbidden');
      if (error.status === 404) return t('author.editor.errors.notFound');
      if (error.status === 429) return t('author.editor.errors.tooManyRequests');
    }
    return t('author.editor.errors.generic');
  }

  function showIssues(found: QuizIssue[]) {
    setIssues(found);
    for (const issue of found) {
      form.setError(quizIssueField(issue.path) as never, { type: 'issue', message: issue.message });
    }
  }

  function handleFailure(error: unknown, action: Action) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        retry.current = action;
        setNotice('sessionExpired');
        return;
      }
      if (error.code === 'version_conflict') {
        setNotice('conflict');
        return;
      }
      if (error.code === 'slug_taken') {
        form.setError('slug', { type: 'slug_taken' });
        return;
      }
      if (error.code === 'invalid_quiz') {
        showIssues(invalidQuizIssues(error));
        return;
      }
    }
    setMessage({ tone: 'error', text: errorText(error) });
  }

  async function perform(action: Action, draft: DraftQuiz) {
    if (action === 'publish') {
      const checked = validateForPublish(draft, categoryNames);
      if (!checked.ok) {
        showIssues(checked.issues);
        return;
      }
    }
    setPending(action);
    try {
      let result = await onSave(draft, saved && { slug: saved.slug, version: saved.version });
      const remember = (next: AuthoringQuiz) =>
        setSaved({
          slug: next.slug,
          version: next.version,
          status: next.status,
          everPublished: next.publishedAt !== null,
        });
      remember(result);
      if (action === 'publish') {
        result = await onPublish(result.slug, result.version);
        remember(result);
      }
      setMessage({
        tone: 'ok',
        text:
          action === 'publish'
            ? t('author.editor.actions.published')
            : t('author.editor.actions.saved'),
      });
      onSaved(result, action === 'preview' ? 'preview' : 'stay');
    } catch (error) {
      handleFailure(error, action);
    } finally {
      setPending(undefined);
    }
  }

  function run(action: Action): Promise<void> {
    setMessage(undefined);
    setNotice(undefined);
    setIssues([]);
    return form.handleSubmit((draft) => perform(action, draft))();
  }

  async function loginAndRetry(input: LoginInput) {
    await onLogin(input);
    await run(retry.current);
  }

  async function confirmDelete() {
    if (!saved || !onDelete) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete(saved.slug);
      setDeleteOpen(false);
      onDeleted();
    } catch (error) {
      setDeleteError(errorText(error));
    } finally {
      setDeleting(false);
    }
  }

  const busy = pending !== undefined;

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          void run('save');
        }}
      >
        <p className="text-sm text-muted-foreground">
          {t('author.editor.limits', {
            questions: MAX_QUESTIONS,
            options: MAX_OPTIONS,
            chars: MAX_TEXT_LENGTH.toLocaleString(),
          })}{' '}
          {published ? t('author.editor.publishedHint') : t('author.editor.draftHint')}
        </p>

        {issues.length > 0 && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm"
          >
            {t('author.editor.issues.summary', { count: issues.length })}
          </p>
        )}
        {notice === 'conflict' && <ConflictNotice onReload={onReload} />}
        {notice === 'sessionExpired' && <SessionExpiredNotice onLogin={loginAndRetry} />}

        <FormField
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('author.editor.fields.title')}</FormLabel>
              <FormControl>
                <Input
                  maxLength={MAX_TEXT_LENGTH}
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage>{fieldState.error && issueText('title')}</FormMessage>
            </FormItem>
          )}
        />
        <SlugField locked={slugLocked} persistedSlug={saved?.slug} checkSlug={checkSlug} />
        <FormField
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('author.editor.fields.description')}</FormLabel>
              <FormControl>
                <Textarea maxLength={MAX_TEXT_LENGTH} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage>{fieldState.error && issueText('description')}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="language"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('author.editor.fields.language')}</FormLabel>
              <FormControl>
                <Input
                  list="quiz-languages"
                  autoComplete="off"
                  spellCheck={false}
                  className="max-w-40"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <datalist id="quiz-languages">
                <option value="uk">{languageName('uk', i18n.language)}</option>
                <option value="en">{languageName('en', i18n.language)}</option>
              </datalist>
              <FormDescription>{t('author.editor.fields.languageHint')}</FormDescription>
              <FormMessage>{fieldState.error && issueText('language')}</FormMessage>
            </FormItem>
          )}
        />
        <CategoryPicker categories={categories} />

        <section aria-labelledby="questions-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="questions-heading" className="text-lg font-semibold">
              {t('author.editor.questions.heading')}
            </h2>
            <span className="text-sm text-muted-foreground">
              {t('author.editor.questions.count', {
                count: questions.fields.length,
                max: MAX_QUESTIONS,
              })}
            </span>
          </div>
          {form.formState.errors.questions && !Array.isArray(form.formState.errors.questions) && (
            <p role="alert" className="text-sm text-destructive">
              {issueText('questions')}
            </p>
          )}
          {questions.fields.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              {t('author.editor.questions.empty')}
            </p>
          )}
          {questions.fields.map((question, index) => (
            <QuestionFields
              key={question.id}
              index={index}
              total={questions.fields.length}
              onRemove={() => questions.remove(index)}
              onMove={(to) => questions.move(index, to)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="self-start"
            disabled={questions.fields.length >= MAX_QUESTIONS}
            onClick={() => questions.append(blankQuestion())}
          >
            <Plus aria-hidden />
            {t('author.editor.questions.add')}
          </Button>
        </section>

        {message && (
          <p
            role={message.tone === 'error' ? 'alert' : 'status'}
            className={message.tone === 'error' ? 'text-sm text-destructive' : 'text-sm'}
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {pending === 'save'
              ? t('author.editor.actions.saving')
              : t('author.editor.actions.save')}
          </Button>
          {!published && (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void run('publish')}
            >
              {pending === 'publish'
                ? t('author.editor.actions.publishing')
                : t('author.editor.actions.publish')}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run('preview')}
          >
            {t('author.editor.actions.preview')}
          </Button>
          {saved && onDelete && (
            <Button
              type="button"
              variant="destructive"
              className="sm:ml-auto"
              disabled={busy}
              onClick={() => {
                setDeleteError(undefined);
                setDeleteOpen(true);
              }}
            >
              {t('author.editor.actions.delete')}
            </Button>
          )}
        </div>
      </form>
      <ConfirmQuizDeleteDialog
        open={deleteOpen}
        title={form.getValues('title') || saved?.slug || ''}
        pending={deleting}
        errorText={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </Form>
  );
}
