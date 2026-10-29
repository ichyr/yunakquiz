import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { interfaceLanguages } from '@/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">{t('interfaceLanguage.label')}</legend>
      {interfaceLanguages.map((language) => {
        const active = i18n.resolvedLanguage === language;
        return (
          <Button
            key={language}
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            aria-pressed={active}
            lang={language}
            title={t(`interfaceLanguage.${language}`)}
            onClick={() => void i18n.changeLanguage(language)}
          >
            {language.toUpperCase()}
          </Button>
        );
      })}
    </fieldset>
  );
}
