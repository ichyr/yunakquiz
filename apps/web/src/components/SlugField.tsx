import {
  draftQuizSchema,
  slugCandidate,
  slugFromTitle,
  type DraftQuizInput,
} from '@yunakquiz/core';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useIssueText } from '@/lib/useIssueText';

/** How many numeric suffixes the generator tries (`name`, `name-2`, ...) before giving up. */
const MAX_GENERATE_ATTEMPTS = 25;
const CHECK_DELAY_MS = 400;

interface SlugFieldProps {
  /** After the first publish an Author cannot change the address; Admins can. */
  locked: boolean;
  /** The address the Quiz is saved under now. It stays free for this Quiz. */
  persistedSlug?: string | undefined;
  /** Resolves whether an address is free. */
  checkSlug: (slug: string, currentSlug: string | undefined) => Promise<boolean>;
}

/** The slug input with "generate from title" and a live uniqueness check. Lives inside an editor form. */
export function SlugField({ locked, persistedSlug, checkSlug }: SlugFieldProps) {
  const { t } = useTranslation();
  const issueText = useIssueText();
  const form = useFormContext<DraftQuizInput>();
  const slug = useWatch({ control: form.control, name: 'slug' }) ?? '';
  // The answer for one address; derived against the current input, so no state is synced.
  const [checked, setChecked] = useState<{ slug: string; available: boolean | null }>();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string>();

  const needsCheck =
    !locked && slug !== persistedSlug && draftQuizSchema.shape.slug.safeParse(slug).success;

  useEffect(() => {
    if (!needsCheck) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      checkSlug(slug, persistedSlug).then(
        (available) => !cancelled && setChecked({ slug, available }),
        // A failed check says nothing; the API checks again on save.
        () => !cancelled && setChecked({ slug, available: null }),
      );
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needsCheck, slug, persistedSlug, checkSlug]);

  const status = !needsCheck
    ? 'idle'
    : checked?.slug !== slug
      ? 'checking'
      : checked.available === null
        ? 'idle'
        : checked.available
          ? 'available'
          : 'taken';

  async function generate() {
    setGenerateError(undefined);
    const base = slugFromTitle(form.getValues('title') ?? '');
    if (base === '') {
      setGenerateError(t('author.editor.fields.generateNeedsTitle'));
      return;
    }
    setGenerating(true);
    try {
      for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt += 1) {
        const candidate = slugCandidate(base, attempt);
        if (await checkSlug(candidate, persistedSlug)) {
          setChecked({ slug: candidate, available: true });
          form.setValue('slug', candidate, { shouldDirty: true, shouldValidate: true });
          return;
        }
      }
      setGenerateError(t('author.editor.fields.generateFailed'));
    } catch {
      setGenerateError(t('author.editor.fields.generateFailed'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <FormField
      control={form.control}
      name="slug"
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{t('author.editor.fields.slug')}</FormLabel>
          <div className="flex flex-wrap gap-2">
            <FormControl>
              <Input
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 basis-48"
                disabled={locked}
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>
            {!locked && (
              <Button
                type="button"
                variant="outline"
                disabled={generating}
                onClick={() => void generate()}
              >
                {t('author.editor.fields.generate')}
              </Button>
            )}
          </div>
          <FormDescription>
            {locked ? t('author.editor.fields.slugLocked') : t('author.editor.fields.slugHint')}
          </FormDescription>
          <output className="block text-sm text-muted-foreground">
            {status === 'checking' && t('author.editor.fields.slugChecking')}
            {status === 'available' && t('author.editor.fields.slugAvailable')}
          </output>
          {(status === 'taken' || fieldState.error?.type === 'slug_taken') && !generateError && (
            <p role="alert" className="text-sm text-destructive">
              {t('author.editor.fields.slugTaken')}
            </p>
          )}
          {generateError && (
            <p role="alert" className="text-sm text-destructive">
              {generateError}
            </p>
          )}
          <FormMessage>
            {fieldState.error && fieldState.error.type !== 'slug_taken' && issueText('slug')}
          </FormMessage>
        </FormItem>
      )}
    />
  );
}
