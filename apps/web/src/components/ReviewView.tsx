import type { QuizSummary, Review } from '@yunakquiz/core';
import { RotateCcwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuizHeader } from './QuizHeader.tsx';
import { ReviewItemCard } from './ReviewItemCard.tsx';

interface ReviewViewProps {
  quiz: QuizSummary;
  review: Review;
  onTryAgain: () => void;
}

export function ReviewView({ quiz, review, onTryAgain }: ReviewViewProps) {
  const { t } = useTranslation();
  const { correct, total } = review.score;

  const tryAgain = (
    <Button size="lg" onClick={onTryAgain}>
      <RotateCcwIcon aria-hidden />
      {t('review.tryAgain')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <QuizHeader quiz={quiz} />

      <section
        aria-labelledby="review-title"
        className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-6 text-center shadow-sm"
      >
        <h2 id="review-title" className="text-sm font-medium text-muted-foreground">
          {t('review.title')} · {t('review.score')}
        </h2>
        <p className="text-5xl font-bold tabular-nums">
          {correct} / {total}
        </p>
        <p className="text-sm text-muted-foreground">
          {correct === total ? t('review.perfect') : t('review.keepLearning')}
        </p>
        {tryAgain}
      </section>

      <ol className="flex flex-col gap-4">
        {review.items.map((item, index) => (
          <li key={item.questionId}>
            <ReviewItemCard item={item} number={index + 1} total={total} language={quiz.language} />
          </li>
        ))}
      </ol>

      <div className="flex justify-center">{tryAgain}</div>
    </div>
  );
}
