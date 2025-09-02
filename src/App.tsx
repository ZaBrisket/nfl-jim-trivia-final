import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const App: React.FC = () => {
  return (
    <div>
      <nav className="card" style={{ margin: 16 }}>
        <div className="row">
          <Link to="/"><strong>NFL Trivia</strong></Link>
          <div className="grow" />
          <Link to="/">Endless</Link>
          <Link to="/daily">Daily</Link>
          <a href="https://example.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
        </div>
      </nav>
      <Outlet />
      <footer className="container footer">
        No accounts. No tracking. Local-only streaks.
      </footer>
    </div>
  );
};
