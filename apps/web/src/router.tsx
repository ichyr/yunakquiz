import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/AppLayout.tsx';
import { LoadingState } from './components/LoadingState.tsx';
import { AdminGate } from './routes/AdminGate.tsx';
import { NotFoundPage } from './routes/NotFoundPage.tsx';
import { RootLayout } from './routes/RootLayout.tsx';
import { RouteErrorPage } from './routes/RouteErrorPage.tsx';

// Each page is its own chunk, loaded on first visit. A chunk that fails to load
// reaches the route's errorElement, whose Retry reloads the page.
// Paths mirror the planned Expo Router files, so shared links open the same screen (ADR 0004).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    // First load: show the layout around the spinner while the first page chunk arrives.
    HydrateFallback: () => (
      <AppLayout>
        <LoadingState />
      </AppLayout>
    ),
    children: [
      {
        path: '/',
        lazy: () => import('./routes/HomePage.tsx').then((m) => ({ Component: m.HomePage })),
      },
      {
        path: '/search',
        lazy: () => import('./routes/SearchPage.tsx').then((m) => ({ Component: m.SearchPage })),
      },
      {
        path: '/categories/:slug',
        lazy: () =>
          import('./routes/CategoryPage.tsx').then((m) => ({ Component: m.CategoryPage })),
      },
      {
        path: '/quizzes/:slug',
        lazy: () => import('./routes/QuizPage.tsx').then((m) => ({ Component: m.QuizPage })),
      },
      {
        path: '/register',
        lazy: () =>
          import('./routes/RegisterPage.tsx').then((m) => ({ Component: m.RegisterPage })),
      },
      {
        path: '/login',
        lazy: () => import('./routes/LoginPage.tsx').then((m) => ({ Component: m.LoginPage })),
      },
      {
        path: '/verify',
        lazy: () => import('./routes/VerifyPage.tsx').then((m) => ({ Component: m.VerifyPage })),
      },
      // Guarded: AdminGate loads the Admin chunk only for an Admin.
      { path: '/admin/users', element: <AdminGate page="users" /> },
      { path: '/admin/categories', element: <AdminGate page="categories" /> },
      {
        path: '/account',
        lazy: () => import('./routes/AccountPage.tsx').then((m) => ({ Component: m.AccountPage })),
      },
      {
        path: '/confirm-email',
        lazy: () =>
          import('./routes/ConfirmEmailPage.tsx').then((m) => ({ Component: m.ConfirmEmailPage })),
      },
      {
        path: '/reset-password',
        lazy: () =>
          import('./routes/ResetPasswordPage.tsx').then((m) => ({
            Component: m.ResetPasswordPage,
          })),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
