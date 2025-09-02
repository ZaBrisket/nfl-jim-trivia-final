import React from 'react';
import ReactDOM from 'react-dom/client';
import { RootRouter } from './router';
import { DataProvider } from './context/DataContext';
import './styles.css';

const Root = () => (
  <React.StrictMode>
    <DataProvider>
      <RootRouter />
    </DataProvider>
  </React.StrictMode>
);

const el = document.getElementById('root')!;
ReactDOM.createRoot(el).render(<Root />);

// Register service worker only in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // non-fatal
    });
  });
}
