import type { ReviewItem } from '@yunakquiz/core';
import { CheckIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Explanation } from './Explanation.tsx';
import { QuestionHeader } from './QuestionHeader.tsx';

interface ReviewItemCardProps {
  item: ReviewItem;
  /** 1-based position on the page. */
  number: number;
  total: number;
  language: string;
}

export function ReviewItemCard({ item, number, total, language }: ReviewItemCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="gap-4">
      <QuestionHeader
        prompt={item.prompt}
        number={number}
        total={total}
        language={language}
        aside={
          item.isCorrect ? (
            <Badge className="bg-success text-success-foreground">
              <CheckIcon aria-hidden />
              {t('review.correct')}
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XIcon aria-hidden />
              {t('review.incorrect')}
            </Badge>
          )
        }
      />
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {item.options.map((option) => {
            const correct = option.id === item.correctOptionId;
            const chosen = option.id === item.chosenOptionId;
            return (
              <li
                key={option.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-sm',
                  correct && 'border-success bg-success-subtle',
                  chosen && !correct && 'border-destructive bg-destructive-subtle',
                  !correct && !chosen && 'text-muted-foreground',
                )}
              >
                {correct ? (
                  <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                ) : chosen ? (
                  <XIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <span aria-hidden className="size-4 shrink-0" />
                )}
                <div className="flex flex-col gap-1">
                  <span lang={language} className="leading-snug">
                    {option.text}
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
          })}
        </ul>
        <section className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t('review.explanation')}
          </h3>
          <Explanation text={item.explanation} language={language} />
        </section>
      </CardContent>
    </Card>
  );
}
