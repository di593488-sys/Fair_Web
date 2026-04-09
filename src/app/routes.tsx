import { createBrowserRouter } from 'react-router';
import { LandingPage } from './pages/LandingPage';
import { ExhibitionDetail } from './pages/ExhibitionDetail';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/exhibition/:id',
    element: <ExhibitionDetail />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
