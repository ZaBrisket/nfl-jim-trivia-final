import React from 'react';
import { Player, Position, SeasonRow } from '../types';
import { SeasonState, usePlayerSeasons } from '../hooks/usePlayerSeasons';

type ColumnConfig = {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  decimals?: number;
  format?: 'number' | 'plain';
};

type PortraitConfig = {
  columns: ColumnConfig[];
  buildTotals(rows: SeasonRow[]): Record<string, number | string> | null;
  emptyCopy: string;
};

type PlayerPortraitProps = {
  player: Player;
  hideIdentity?: boolean;
  seasonState?: SeasonState;
};

const formatNumber = (value: number, decimals: number = 0): string => {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const sumField = (rows: SeasonRow[], field: string): number =>
  rows.reduce((total, row) => total + toNumber(row[field]), 0);

const ratio = (numerator: number, denominator: number, scale = 1): number =>
  denominator > 0 ? (numerator / denominator) * scale : 0;

const passerRating = (cmp: number, att: number, yds: number, td: number, ints: number): number => {
  if (att <= 0) return 0;
  const clamp = (val: number) => Math.max(0, Math.min(val, 2.375));
  const a = clamp(((cmp / att) - 0.3) * 5);
  const b = clamp(((yds / att) - 3) * 0.25);
  const c = clamp((td / att) * 20);
  const d = clamp(2.375 - ((ints / att) * 25));
  return ((a + b + c + d) / 6) * 100;
};

const buildQuarterbackTotals = (rows: SeasonRow[]): Record<string, number | string> | null => {
  if (!rows.length) return null;
  const totals: Record<string, number | string> = {
    year: 'Career',
    team: '',
    games: sumField(rows, 'games'),
    gamesStarted: sumField(rows, 'gamesStarted'),
    passCmp: sumField(rows, 'passCmp'),
    passAtt: sumField(rows, 'passAtt'),
    passYds: sumField(rows, 'passYds'),
    passTd: sumField(rows, 'passTd'),
    passInt: sumField(rows, 'passInt'),
    passSacked: sumField(rows, 'passSacked'),
    passSackedYds: sumField(rows, 'passSackedYds')
  };

  const cmp = toNumber(totals.passCmp);
  const att = toNumber(totals.passAtt);
  const yds = toNumber(totals.passYds);
  const td = toNumber(totals.passTd);
  const ints = toNumber(totals.passInt);

  totals.passCmpPct = ratio(cmp, att, 100);
  totals.passYdsPerAtt = ratio(yds, att);
  totals.passAdjYdsPerAtt = att > 0 ? ((yds + (20 * td) - (45 * ints)) / att) : 0;
  totals.passRating = passerRating(cmp, att, yds, td, ints);

  return totals;
};

const buildRushingTotals = (rows: SeasonRow[]): Record<string, number | string> | null => {
  if (!rows.length) return null;
  const totals: Record<string, number | string> = {
    year: 'Career',
    team: '',
    games: sumField(rows, 'games'),
    gamesStarted: sumField(rows, 'gamesStarted'),
    rushAtt: sumField(rows, 'rushAtt'),
    rushYds: sumField(rows, 'rushYds'),
    rushTd: sumField(rows, 'rushTd'),
    rushFirstDown: sumField(rows, 'rushFirstDown'),
    targets: sumField(rows, 'targets'),
    rec: sumField(rows, 'rec'),
    recYds: sumField(rows, 'recYds'),
    recTd: sumField(rows, 'recTd'),
    recFirstDown: sumField(rows, 'recFirstDown'),
    ydsFromScrimmage: sumField(rows, 'ydsFromScrimmage'),
    rushReceiveTd: sumField(rows, 'rushReceiveTd')
  };

  const games = toNumber(totals.games);
  const carries = toNumber(totals.rushAtt);
  const rushYds = toNumber(totals.rushYds);
  const targets = toNumber(totals.targets);
  const rec = toNumber(totals.rec);
  const recYds = toNumber(totals.recYds);

  totals.rushYdsPerAtt = ratio(rushYds, carries);
  totals.rushYdsPerG = ratio(rushYds, games);
  totals.recYdsPerRec = ratio(recYds, rec);
  totals.catchPct = ratio(rec, targets, 100);
  totals.recYdsPerTgt = ratio(recYds, targets);

  return totals;
};

const buildReceiverTotals = (rows: SeasonRow[]): Record<string, number | string> | null => {
  if (!rows.length) return null;
  const totals: Record<string, number | string> = {
    year: 'Career',
    team: '',
    games: sumField(rows, 'games'),
    gamesStarted: sumField(rows, 'gamesStarted'),
    targets: sumField(rows, 'targets'),
    rec: sumField(rows, 'rec'),
    recYds: sumField(rows, 'recYds'),
    recTd: sumField(rows, 'recTd'),
    recFirstDown: sumField(rows, 'recFirstDown'),
    recPerG: 0,
    recYdsPerG: 0,
    catchPct: 0,
    recYdsPerTgt: 0,
    rushAtt: sumField(rows, 'rushAtt'),
    rushYds: sumField(rows, 'rushYds'),
    rushTd: sumField(rows, 'rushTd'),
    ydsFromScrimmage: sumField(rows, 'ydsFromScrimmage')
  };

  const games = toNumber(totals.games);
  const rec = toNumber(totals.rec);
  const targets = toNumber(totals.targets);
  const recYds = toNumber(totals.recYds);
  const rushAtt = toNumber(totals.rushAtt);
  const rushYds = toNumber(totals.rushYds);

  totals.recYdsPerRec = ratio(recYds, rec);
  totals.catchPct = ratio(rec, targets, 100);
  totals.recYdsPerTgt = ratio(recYds, targets);
  totals.recPerG = ratio(rec, games);
  totals.recYdsPerG = ratio(recYds, games);
  totals.rushYdsPerAtt = ratio(rushYds, rushAtt);

  return totals;
};

const PORTRAIT_CONFIG: Record<Position, PortraitConfig> = {
  QB: {
    columns: [
      { key: 'year', label: 'Season', width: '70px', align: 'left', format: 'plain' },
      { key: 'team', label: 'Tm', width: '50px', align: 'center' },
      { key: 'games', label: 'G', align: 'right' },
      { key: 'gamesStarted', label: 'GS', align: 'right' },
      { key: 'passCmp', label: 'Cmp', align: 'right' },
      { key: 'passAtt', label: 'Att', align: 'right' },
      { key: 'passCmpPct', label: 'Cmp%', align: 'right', decimals: 1 },
      { key: 'passYds', label: 'Yds', align: 'right' },
      { key: 'passTd', label: 'TD', align: 'right' },
      { key: 'passInt', label: 'Int', align: 'right' },
      { key: 'passYdsPerAtt', label: 'Y/A', align: 'right', decimals: 1 },
      { key: 'passAdjYdsPerAtt', label: 'AY/A', align: 'right', decimals: 1 },
      { key: 'passRating', label: 'Rate', align: 'right', decimals: 1 },
      { key: 'passSacked', label: 'Sk', align: 'right' },
      { key: 'passSackedYds', label: 'SkY', align: 'right' }
    ],
    buildTotals: buildQuarterbackTotals,
    emptyCopy: 'No passing data found for this player.'
  },
  RB: {
    columns: [
      { key: 'year', label: 'Season', width: '70px', align: 'left', format: 'plain' },
      { key: 'team', label: 'Tm', width: '50px', align: 'center' },
      { key: 'games', label: 'G', align: 'right' },
      { key: 'gamesStarted', label: 'GS', align: 'right' },
      { key: 'rushAtt', label: 'Rush', align: 'right' },
      { key: 'rushYds', label: 'Rush Yds', align: 'right' },
      { key: 'rushYdsPerAtt', label: 'Y/A', align: 'right', decimals: 1 },
      { key: 'rushTd', label: 'Rush TD', align: 'right' },
      { key: 'rushFirstDown', label: '1D', align: 'right' },
      { key: 'rushYdsPerG', label: 'Rush Y/G', align: 'right', decimals: 1 },
      { key: 'targets', label: 'Tgt', align: 'right' },
      { key: 'rec', label: 'Rec', align: 'right' },
      { key: 'recYds', label: 'Rec Yds', align: 'right' },
      { key: 'recYdsPerRec', label: 'Y/R', align: 'right', decimals: 1 },
      { key: 'recTd', label: 'Rec TD', align: 'right' },
      { key: 'catchPct', label: 'Ctch%', align: 'right', decimals: 1 },
      { key: 'recYdsPerTgt', label: 'Y/Tgt', align: 'right', decimals: 1 },
      { key: 'ydsFromScrimmage', label: 'Scrim Yds', align: 'right' },
      { key: 'rushReceiveTd', label: 'Tot TD', align: 'right' }
    ],
    buildTotals: buildRushingTotals,
    emptyCopy: 'No rushing/receiving data found for this player.'
  },
  WR: {
    columns: [
      { key: 'year', label: 'Season', width: '70px', align: 'left', format: 'plain' },
      { key: 'team', label: 'Tm', width: '50px', align: 'center' },
      { key: 'games', label: 'G', align: 'right' },
      { key: 'gamesStarted', label: 'GS', align: 'right' },
      { key: 'targets', label: 'Tgt', align: 'right' },
      { key: 'rec', label: 'Rec', align: 'right' },
      { key: 'recYds', label: 'Yds', align: 'right' },
      { key: 'recYdsPerRec', label: 'Y/R', align: 'right', decimals: 1 },
      { key: 'recTd', label: 'TD', align: 'right' },
      { key: 'recFirstDown', label: '1D', align: 'right' },
      { key: 'recPerG', label: 'Rec/G', align: 'right', decimals: 1 },
      { key: 'recYdsPerG', label: 'Y/G', align: 'right', decimals: 1 },
      { key: 'catchPct', label: 'Ctch%', align: 'right', decimals: 1 },
      { key: 'recYdsPerTgt', label: 'Y/Tgt', align: 'right', decimals: 1 },
      { key: 'rushAtt', label: 'Rush', align: 'right' },
      { key: 'rushYds', label: 'Rush Yds', align: 'right' },
      { key: 'rushTd', label: 'Rush TD', align: 'right' },
      { key: 'ydsFromScrimmage', label: 'Scrim Yds', align: 'right' }
    ],
    buildTotals: buildReceiverTotals,
    emptyCopy: 'No receiving data found for this player.'
  },
  TE: {
    columns: [
      { key: 'year', label: 'Season', width: '70px', align: 'left', format: 'plain' },
      { key: 'team', label: 'Tm', width: '50px', align: 'center' },
      { key: 'games', label: 'G', align: 'right' },
      { key: 'gamesStarted', label: 'GS', align: 'right' },
      { key: 'targets', label: 'Tgt', align: 'right' },
      { key: 'rec', label: 'Rec', align: 'right' },
      { key: 'recYds', label: 'Yds', align: 'right' },
      { key: 'recYdsPerRec', label: 'Y/R', align: 'right', decimals: 1 },
      { key: 'recTd', label: 'TD', align: 'right' },
      { key: 'recFirstDown', label: '1D', align: 'right' },
      { key: 'catchPct', label: 'Ctch%', align: 'right', decimals: 1 },
      { key: 'recYdsPerTgt', label: 'Y/Tgt', align: 'right', decimals: 1 },
      { key: 'recPerG', label: 'Rec/G', align: 'right', decimals: 1 },
      { key: 'recYdsPerG', label: 'Y/G', align: 'right', decimals: 1 },
      { key: 'ydsFromScrimmage', label: 'Scrim Yds', align: 'right' }
    ],
    buildTotals: buildReceiverTotals,
    emptyCopy: 'No receiving data found for this tight end.'
  }
};

const renderValue = (value: number | string | undefined, column: ColumnConfig): string => {
  if (value === undefined || value === null) return '-';
  if (column.format === 'plain') {
    return String(value);
  }
  if (typeof value === 'number') {
    return formatNumber(value, column.decimals);
  }
  return value;
};

export const PlayerPortrait: React.FC<PlayerPortraitProps> = ({ player, hideIdentity = false, seasonState }) => {
  const hookState = usePlayerSeasons(seasonState ? null : player);
  const { status, seasons, error } = seasonState ?? hookState;
  const config = PORTRAIT_CONFIG[player.position];
  const totals = React.useMemo(() => config.buildTotals(seasons), [config, seasons]);
  const headline = hideIdentity ? `${player.position} Career Snapshot` : `${player.displayName} Career Snapshot`;
  const sublineParts = [
    `Seasons: ${seasons.length || '-'}`,
    player.rookieYear ? `Rookie: ${player.rookieYear}` : null
  ].filter(Boolean);

  return (
    <div className="portrait-card" aria-live="polite">
      <div className="portrait-header">
        <div>
          <div className="portrait-headline">{headline}</div>
          <div className="portrait-subline">{sublineParts.join(' | ')}</div>
        </div>
        <span className="portrait-tag">{player.position}</span>
      </div>

      {status === 'loading' && (
        <div className="portrait-placeholder">Loading player stats…</div>
      )}

      {status === 'error' && (
        <div className="portrait-placeholder error">
          Failed to load stats: {error}
        </div>
      )}

      {status === 'ready' && seasons.length === 0 && (
        <div className="portrait-placeholder">{config.emptyCopy}</div>
      )}

      {seasons.length > 0 && (
        <div className="portrait-table-wrapper">
          <table className="portrait-table">
            <thead>
              <tr>
                {config.columns.map(column => (
                  <th
                    key={column.key}
                    style={{ width: column.width, textAlign: column.align }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seasons.map(row => (
                <tr key={`${row.playerId}-${row.year}`}>
                  {config.columns.map(column => (
                    <td
                      key={column.key}
                      style={{ textAlign: column.align }}
                    >
                      {renderValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))}
              {totals && (
                <tr className="portrait-total">
                  {config.columns.map((column, index) => (
                    <td
                      key={`${column.key}-total`}
                      style={{ textAlign: column.align }}
                    >
                      {index === 0
                        ? 'Career'
                        : renderValue(totals[column.key], column)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
