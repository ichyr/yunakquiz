import type { AttemptQuestion } from '@yunakquiz/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface QuestionFieldProps {
  question: AttemptQuestion;
  /** 1-based position on the page. */
  number: number;
  total: number;
  language: string;
  chosenOptionId: number | undefined;
  onChoose: (optionId: number) => void;
}

export function QuestionField({
  question,
  number,
  total,
  language,
  chosenOptionId,
  onChoose,
}: QuestionFieldProps) {
  const { t } = useTranslation();
  const promptId = useId();

  return (
    <Card className="gap-4">
      <CardHeader className="gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('attempt.question', { number, total })}
        </p>
        <h2 id={promptId} lang={language} className="text-base leading-snug font-semibold">
          {question.prompt}
        </h2>
      </CardHeader>
      <CardContent>
        <RadioGroup
          aria-labelledby={promptId}
          value={chosenOptionId === undefined ? '' : String(chosenOptionId)}
          onValueChange={(value) => onChoose(Number(value))}
          className="gap-2"
        >
          {question.options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
            >
              <RadioGroupItem value={String(option.id)} className="mt-0.5" />
              <span lang={language} className="text-sm leading-snug">
                {option.text}
              </span>
            </label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
