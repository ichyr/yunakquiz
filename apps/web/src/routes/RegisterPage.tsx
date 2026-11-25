import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useRegister } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { PageMessage } from '@/components/PageMessage';
import { PageTitle } from '@/components/PageTitle';
import { RegisterForm } from '@/components/RegisterForm';

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const register = useRegister();
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'uk';

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('auth.registerPage.title')} />
      <PageTitle>{t('auth.registerPage.title')}</PageTitle>
      {register.isSuccess ? (
        <PageMessage
          title={t('auth.registerPage.sentTitle')}
          description={t('auth.registerPage.sentDescription')}
        />
      ) : (
        <>
          <RegisterForm interfaceLanguage={language} onSubmit={register.mutateAsync} />
          <p className="text-sm text-muted-foreground">
            {t('auth.registerPage.haveAccount')}{' '}
            <Link to="/login" className="focus-ring rounded-sm text-primary underline">
              {t('auth.login')}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
