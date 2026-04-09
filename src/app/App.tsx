import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ExhibitionsProvider } from './context/ExhibitionsContext';

export default function App() {
  return (
    <ExhibitionsProvider>
      <RouterProvider router={router} />
    </ExhibitionsProvider>
  );
}