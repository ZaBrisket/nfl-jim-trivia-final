import React from 'react';
import { PlayerSummary } from '../utils/playerInsights';

type Props = {
  summary?: PlayerSummary;
};

type StatDescriptor = {
  label: string;
  value: number;
  display: string;
};

const STAT_PRIORITY: Array<keyof NonNullable<PlayerSummary['totals']>> = [
  'passYds',
  'rushYds',
  'recYds',
  'scrimmageYds',
  'passTd',
  'rushTd',
  'recTd'
];

const STAT_LABELS: Record<string, string> = {
  passYds: 'Pass Yds',
  rushYds: 'Rush Yds',
  recYds: 'Rec Yds',
  scrimmageYds: 'Scrim Yds',
  passTd: 'Pass TDs',
  rushTd: 'Rush TDs',
  recTd: 'Rec TDs'
};

const formatNumber = (value: number): string =>
  value.toLocaleString('en-US', { maximumFractionDigits: 0 });

const pickHighlightStat = (summary?: PlayerSummary): StatDescriptor | null => {
  if (!summary) return null;
  for (const key of STAT_PRIORITY) {
    const value = summary.totals[key];
    if (value && value > 0) {
      return {
        label: STAT_LABELS[key] ?? key,
        value,
        display: formatNumber(value)
      };
    }
  }
  return null;
};

const PlayerContextPanel: React.FC<Props> = ({ summary }) => {
  if (!summary) return null;

  const eraLabel =
    summary.firstSeason && summary.lastSeason
      ? summary.firstSeason === summary.lastSeason
        ? `${summary.firstSeason}`
        : `${summary.firstSeason} – ${summary.lastSeason}`
      : summary.firstSeason ?? '—';

  const highlight = pickHighlightStat(summary);
  const teamList = summary.teamNames.length
    ? summary.teamNames
    : summary.primaryTeamName
      ? [summary.primaryTeamName]
      : [];

  return (
    <div className="player-context-card">
      <div className="player-context-card__row">
        <div>
          <span className="label">Era</span>
          <strong>{eraLabel}</strong>
          <span className="subtext">{summary.seasonsPlayed} seasons</span>
        </div>
        {highlight && (
          <div>
            <span className="label">Career Highlight</span>
            <strong>{highlight.display}</strong>
            <span className="subtext">{highlight.label}</span>
          </div>
        )}
      </div>
      {teamList.length > 0 && (
        <div className="player-context-card__teams">
          <span className="label">Teams</span>
          <div className="team-chips">
            {teamList.map(team => (
              <span key={team} className="chip">
                {team}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export { PlayerContextPanel };
