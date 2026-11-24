import type { OptionOutcome } from '@yunakquiz/core';
import { cva } from 'class-variance-authority';
import { CheckIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const reviewOptionVariants = cva('flex items-start gap-3 rounded-lg border p-3 text-sm', {
  variants: {
    state: {
      correct: 'border-success bg-success-subtle',
      wrong: 'border-destructive bg-destructive-subtle',
      other: 'text-muted-foreground',
    },
  },
});

interface ReviewOptionProps {
  text: string;
  state: OptionOutcome;
  /** The scout picked this Option during the Attempt. */
  chosen: boolean;
  language: string;
}

export function ReviewOption({ text, state, chosen, language }: ReviewOptionProps) {
  const { t } = useTranslation();
  const correct = state === 'correct';

  return (
    <li className={reviewOptionVariants({ state })}>
      {correct ? (
        <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
      ) : state === 'wrong' ? (
        <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <span aria-hidden className="size-4 shrink-0" />
      )}
      <div className="flex flex-col gap-1">
        <span lang={language} className="leading-snug">
          {text}
        </span>
        {(chosen || correct) && (
          <span className="flex flex-wrap gap-x-3 text-xs font-medium">
            {chosen && <span>{t('review.yourAnswer')}</span>}
            {correct && <span className="text-success">{t('review.correctOption')}</span>}
          </span>
        )}
      </div>
    </li>
  );
}
