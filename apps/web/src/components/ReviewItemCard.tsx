import { optionOutcome, type ReviewItem } from '@yunakquiz/core';
import { CheckIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Explanation } from './Explanation.tsx';
import { QuestionHeader } from './QuestionHeader.tsx';
import { ReviewOption } from './ReviewOption.tsx';

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
            <Badge variant="success">
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
          {item.options.map((option) => (
            <ReviewOption
              key={option.id}
              text={option.text}
              state={optionOutcome(item, option.id)}
              chosen={option.id === item.chosenOptionId}
              language={language}
            />
          ))}
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
