import { splitParagraphs } from '@/lib/paragraphs';

export function Explanation({ text, language }: { text: string; language: string }) {
  return (
    <div lang={language} className="flex flex-col gap-2 text-sm leading-relaxed">
      {splitParagraphs(text).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
