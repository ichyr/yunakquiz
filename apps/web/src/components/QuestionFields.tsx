import { MAX_OPTIONS, MAX_TEXT_LENGTH, type DraftQuizInput } from '@yunakquiz/core';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { get, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useIssueText } from '@/lib/useIssueText';

interface QuestionFieldsProps {
  /** Position of the Question in the Quiz. */
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (to: number) => void;
}

/** One Question: prompt, 2 to 10 Options with one Correct Option, and the Explanation. */
export function QuestionFields({ index, total, onRemove, onMove }: QuestionFieldsProps) {
  const { t } = useTranslation();
  const issueText = useIssueText();
  const form = useFormContext<DraftQuizInput>();
  const base = `questions.${index}` as const;
  const options = useFieldArray({ control: form.control, name: `${base}.options` });
  const values = useWatch({ control: form.control, name: `${base}.options` }) ?? [];
  const number = index + 1;
  // A group error from the resolver sits on `options` or, from a manual setError, on `options.root`.
  const groupError = (get(form.formState.errors, `${base}.options.root`) ??
    get(form.formState.errors, `${base}.options`)) as { type?: unknown } | undefined;
  const hasGroupError = typeof groupError?.type === 'string';

  function markCorrect(chosen: number) {
    values.forEach((_, position) =>
      form.setValue(`${base}.options.${position}.correct`, position === chosen ? true : undefined, {
        shouldDirty: true,
      }),
    );
    form.clearErrors(`${base}.options`);
  }

  return (
    <section
      aria-labelledby={`question-${index}-title`}
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`question-${index}-title`} className="font-semibold">
          {t('author.editor.questions.question', { number })}
        </h3>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === 0}
            aria-label={t('author.editor.questions.moveUp', { number })}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === total - 1}
            aria-label={t('author.editor.questions.moveDown', { number })}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('author.editor.questions.remove', { number })}
            onClick={onRemove}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <FormField
        control={form.control}
        name={`${base}.prompt`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('author.editor.questions.prompt')}</FormLabel>
            <FormControl>
              <Textarea maxLength={MAX_TEXT_LENGTH} {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage>{fieldState.error && issueText('prompt')}</FormMessage>
          </FormItem>
        )}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          {t('author.editor.options.heading')}{' '}
          <span className="font-normal text-muted-foreground">
            {t('author.editor.options.count', { count: options.fields.length, max: MAX_OPTIONS })}
          </span>
        </legend>
        {options.fields.map((option, position) => (
          <div key={option.id} className="flex items-start gap-2">
            <label className="flex min-h-11 shrink-0 items-center">
              <input
                type="radio"
                name={`correct-${index}`}
                className="size-5 accent-primary"
                checked={values[position]?.correct === true}
                aria-label={t('author.editor.options.correct', { number: position + 1 })}
                onChange={() => markCorrect(position)}
              />
            </label>
            <FormField
              control={form.control}
              name={`${base}.options.${position}.text`}
              render={({ field, fieldState }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormControl>
                    <Input
                      maxLength={MAX_TEXT_LENGTH}
                      aria-label={t('author.editor.options.option', { number: position + 1 })}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error && issueText('optionText')}</FormMessage>
                </FormItem>
              )}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t('author.editor.options.remove', { number: position + 1 })}
              onClick={() => options.remove(position)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        {hasGroupError && (
          <p role="alert" className="text-sm text-destructive">
            {issueText('options')}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={options.fields.length >= MAX_OPTIONS}
          onClick={() => options.append({ text: '' })}
        >
          <Plus aria-hidden />
          {t('author.editor.options.add')}
        </Button>
      </fieldset>

      <FormField
        control={form.control}
        name={`${base}.explanation`}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>{t('author.editor.questions.explanation')}</FormLabel>
            <FormControl>
              <Textarea maxLength={MAX_TEXT_LENGTH} {...field} value={field.value ?? ''} />
            </FormControl>
            <FormDescription>{t('author.editor.questions.explanationHint')}</FormDescription>
            <FormMessage>{fieldState.error && issueText('explanation')}</FormMessage>
          </FormItem>
        )}
      />
    </section>
  );
}
