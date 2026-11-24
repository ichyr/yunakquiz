import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { languageName } from '@/i18n/languageName';

/** Names the Quiz Language in the Interface Language, e.g. "українська" or "Ukrainian". */
export function QuizLanguageBadge({ language }: { language: string }) {
  const { t, i18n } = useTranslation();
  const name = languageName(language, i18n.resolvedLanguage ?? 'uk');

  return (
    <Badge variant="secondary" title={t('quizLanguage.label', { language: name })}>
      <span className="sr-only">{t('quizLanguage.label', { language: name })}</span>
      <span aria-hidden className="capitalize">
        {name}
      </span>
    </Badge>
  );
}
