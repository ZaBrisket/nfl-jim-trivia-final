import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { usePerformanceMonitor, enablePerformanceLogging } from './hooks/usePerformanceMonitor';

// Enable performance logging in development
enablePerformanceLogging();

export const App: React.FC = () => {
  const performanceStats = usePerformanceMonitor();
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
      
      {/* Performance Debug Panel - Development Only */}
      {process.env.NODE_ENV === 'development' && performanceStats.current && (
        <div className="container" style={{ marginTop: 20 }}>
          <details style={{ fontSize: 12, opacity: 0.7 }}>
            <summary>🚀 Performance Stats</summary>
            <div style={{ marginTop: 8 }}>
              <div>Fuzzy Cache: {performanceStats.current.fuzzyCacheSize} entries</div>
              <div>Active Timers: {performanceStats.current.timerCallbacks}</div>
              <div>Avg Render Time: {performanceStats.averages.renderTime.toFixed(2)}ms</div>
              <div>Avg Input Latency: {performanceStats.averages.inputLatency.toFixed(2)}ms</div>
            </div>
          </details>
        </div>
      )}
      
      <footer className="container footer">
        No accounts. No tracking. Local-only streaks.
      </footer>
    </div>
  );
};
