import React from 'react';
import { useData } from '../context/DataContext';

export const DataStatusBanner: React.FC = React.memo(() => {
  const { status, reload } = useData();
  if (!status.partial && !status.error) return null;
  return (
    <div className="card" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
      {status.error ? (
        <div className="error">Some data failed to load. The app is using fallback datasets.</div>
      ) : (
        <div className="notice">Running with partial data (fallbacks).</div>
      )}
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Details: {status.details?.join(', ')}
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={reload}>Retry loading</button>
      </div>
    </div>
  );
});
