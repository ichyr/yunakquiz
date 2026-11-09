import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CardHeader } from '@/components/ui/card';

interface QuestionHeaderProps {
  prompt: string;
  /** 1-based position on the page. */
  number: number;
  total: number;
  /** Quiz Language of the prompt. */
  language: string;
  /** Id for the prompt heading, so a control can be labelled by it. */
  promptId?: string;
  /** Shown beside the question number, such as the Review's correct / incorrect badge. */
  aside?: ReactNode;
}

/** The "Question 2 of 5" label and prompt, shared by the Attempt and the Review. */
export function QuestionHeader({
  prompt,
  number,
  total,
  language,
  promptId,
  aside,
}: QuestionHeaderProps) {
  const { t } = useTranslation();

  return (
    <CardHeader className="gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('attempt.question', { number, total })}
        </p>
        {aside}
      </div>
      <h2 id={promptId} lang={language} className="text-base leading-snug font-semibold">
        {prompt}
      </h2>
    </CardHeader>
  );
}
