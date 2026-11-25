import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useLogin } from '@/api/queries';
import { DocumentTitle } from '@/components/DocumentTitle';
import { LoginForm } from '@/components/LoginForm';
import { PageTitle } from '@/components/PageTitle';

export function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle page={t('auth.loginPage.title')} />
      <PageTitle>{t('auth.loginPage.title')}</PageTitle>
      <LoginForm
        onSubmit={async (input) => {
          await login.mutateAsync(input);
          await navigate('/');
        }}
      />
      <p className="text-sm text-muted-foreground">
        {t('auth.loginPage.noAccount')}{' '}
        <Link to="/register" className="focus-ring rounded-sm text-primary underline">
          {t('auth.register')}
        </Link>
      </p>
    </div>
  );
}
