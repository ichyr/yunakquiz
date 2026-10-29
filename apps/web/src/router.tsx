import { createBrowserRouter } from 'react-router';
import { CategoryPage } from './routes/CategoryPage.tsx';
import { HomePage } from './routes/HomePage.tsx';
import { NotFoundPage } from './routes/NotFoundPage.tsx';
import { QuizPage } from './routes/QuizPage.tsx';
import { RootLayout } from './routes/RootLayout.tsx';
import { RouteErrorPage } from './routes/RouteErrorPage.tsx';
import { SearchPage } from './routes/SearchPage.tsx';

// Paths mirror the planned Expo Router files, so shared links open the same screen (ADR 0004).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/categories/:slug', element: <CategoryPage /> },
      { path: '/quizzes/:slug', element: <QuizPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
