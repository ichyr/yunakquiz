import type { AttemptQuestion } from '@yunakquiz/core';
import { useId } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QuestionHeader } from './QuestionHeader.tsx';

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
  const promptId = useId();

  return (
    <Card className="gap-4">
      <QuestionHeader
        prompt={question.prompt}
        number={number}
        total={total}
        language={language}
        promptId={promptId}
      />
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
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
            >
              <RadioGroupItem value={String(option.id)} />
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
