import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';

// Lazy load pages for code splitting
const Game = React.lazy(() => import('./pages/Game').then(module => ({ default: module.Game })));
const Daily = React.lazy(() => import('./pages/Daily').then(module => ({ default: module.Daily })));

// Loading component
const PageLoader: React.FC = () => (
  <div className="container" style={{ textAlign: 'center', padding: '2rem' }}>
    <div>Loading...</div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<PageLoader />}>
            <Game />
          </Suspense>
        )
      },
      { 
        path: 'daily', 
        element: (
          <Suspense fallback={<PageLoader />}>
            <Daily />
          </Suspense>
        )
      }
    ]
  }
]);

export const RootRouter: React.FC = () => <RouterProvider router={router} />;
