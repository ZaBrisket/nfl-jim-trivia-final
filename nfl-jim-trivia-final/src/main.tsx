
import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './routes/App'
import Home from './routes/Home'
import Daily from './routes/Daily'
import About from './routes/About'
import Privacy from './routes/Privacy'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'daily', element: <Daily /> },
      { path: 'about', element: <About /> },
      { path: 'privacy', element: <Privacy /> }
    ]
  }
])

const root = createRoot(document.getElementById('root')!)
root.render(<RouterProvider router={router} />)
