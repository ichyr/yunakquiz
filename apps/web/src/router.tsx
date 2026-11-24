import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/AppLayout.tsx';
import { LoadingState } from './components/LoadingState.tsx';
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
