import React from 'react';
import { PlayerHint, AccoladeBadge, PlayerAccolades } from '../utils/playerInsights';

type Props = {
  hints: PlayerHint[];
};

const formatBadgePrimary = (badge: AccoladeBadge): string => {
  if (badge.count > 1) {
    return `${badge.count}x ${badge.label}`;
  }
  const [year] = badge.years;
  return year ? `${year} ${badge.label}` : badge.label;
};

const formatBadgeSecondary = (badge: AccoladeBadge): string | null => {
  if (badge.count <= 1) {
    return badge.years.length > 1 ? badge.years.join(', ') : null;
  }
  return badge.years.length ? badge.years.join(', ') : null;
};

const AccoladeHint: React.FC<{ data: PlayerAccolades }> = ({ data }) => {
  const pills = [];
  if (data.proBowls > 0) {
    pills.push({ id: 'pro-bowl', label: 'Pro Bowl', count: data.proBowls });
  }
  if (data.allProFirstTeam > 0) {
    pills.push({ id: 'all-pro', label: 'All-Pro', count: data.allProFirstTeam });
  }

  return (
    <div className="accolade-hint" role="group" aria-label="Career accolades">
      {pills.length > 0 && (
        <div className="accolade-hint__pills">
          {pills.map(pill => (
            <span key={pill.id} className="accolade-hint__pill">
              <strong>{pill.count}x</strong> {pill.label}
            </span>
          ))}
        </div>
      )}
      {data.badges.length > 0 && (
        <div className="accolade-hint__badges">
          {data.badges.map(badge => {
            const secondary = formatBadgeSecondary(badge);
            return (
              <div
                key={badge.id}
                className="accolade-hint__badge"
                title={
                  badge.years.length
                    ? `${badge.description} (${badge.years.join(', ')})`
                    : badge.description
                }
              >
                <span className="accolade-hint__badge-primary">{formatBadgePrimary(badge)}</span>
                {secondary && <span className="accolade-hint__badge-secondary">{secondary}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HintList: React.FC<Props> = ({ hints }) => {
  if (hints.length === 0) {
    return (
      <div className="hint-list hint-list--empty" aria-live="polite">
        No hints used yet.
      </div>
    );
  }

  return (
    <ol className="hint-list" aria-live="polite">
      {hints.map((hint, index) => (
        <li key={`hint-${index}-${hint.kind}`} className="hint-list__item">
          <div className="hint-index">Hint {index + 1}:</div>
          {hint.kind === 'text' ? (
            <p className="hint-text">{hint.text}</p>
          ) : (
            <AccoladeHint data={hint.data} />
          )}
        </li>
      ))}
    </ol>
  );
};

export { HintList };
