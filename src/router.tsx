import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { Game } from './pages/Game';
import { Daily } from './pages/Daily';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Game /> },
      { path: 'daily', element: <Daily /> }
    ]
  }
]);

export const RootRouter: React.FC = () => <RouterProvider router={router} />;
