import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PLAYER_DATA_DIR = path.join(__dirname, '..', 'NFL Jim - Player Data');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');

// Position-specific CSV files to use
const POSITION_CSV_MAP = {
  'QB': 'passing.csv',
  'RB': 'rushing_and_receiving.csv',
  'WR': 'receiving_and_rushing.csv',
  'TE': 'receiving_and_rushing.csv'
};

/**
 * Parse player name into firstName and lastName
 */
function parsePlayerName(fullName) {
  const parts = fullName.trim().split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  // Handle names with Jr., Sr., III, etc.
  const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
  const lastName = suffixes.some(s => fullName.includes(s))
    ? parts.slice(1).join(' ')
    : parts[parts.length - 1];
  const firstName = parts.slice(0, parts.length - lastName.split(' ').length).join(' ');

  return { firstName: firstName || parts[0], lastName };
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Process a single player folder
 */
function processPlayer(playerFolder) {
  const donePath = path.join(PLAYER_DATA_DIR, playerFolder, '_done.json');

  // Check if _done.json exists
  if (!fs.existsSync(donePath)) {
    return null;
  }

  try {
    const doneData = JSON.parse(fs.readFileSync(donePath, 'utf8'));
    const { player_id, player_name, position } = doneData;

    // Only process QB, RB, WR, TE
    if (!['QB', 'RB', 'WR', 'TE'].includes(position)) {
      return null;
    }

    const { firstName, lastName } = parsePlayerName(player_name);

    // Create player object
    const player = {
      id: player_id,
      firstName,
      lastName,
      displayName: player_name,
      position
    };

    // Find and process the appropriate CSV file
    const csvFileName = `${player_id}__${POSITION_CSV_MAP[position]}`;
    const csvPath = path.join(PLAYER_DATA_DIR, playerFolder, csvFileName);

    let seasonRows = [];
    let rookieYear = null;

    if (fs.existsSync(csvPath)) {
      try {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          relax_quotes: true,
          trim: true
        });

        // Convert each record to SeasonRow
        seasonRows = records
          .map(record => {
            const year = parseInt(record.year_id);

            // Skip invalid years
            if (isNaN(year) || year < 1920 || year > 2025) {
              return null;
            }

            // Track rookie year
            if (!rookieYear || year < rookieYear) {
              rookieYear = year;
            }

            // Build season row with normalized column names
            const seasonRow = {
              playerId: player_id,
              year,
              team: record.team_name_abbr || '',
              games: parseInt(record.games) || 0
            };

            // Add all other numeric columns
            for (const [key, value] of Object.entries(record)) {
              // Skip already processed columns and non-numeric columns
              if (['player_id', 'player_name', 'position', 'year_id', 'team_name_abbr', 'comp_name_abbr', 'pos', 'games', 'age'].includes(key)) {
                continue;
              }

              const camelKey = toCamelCase(key);

              // Try to parse as number
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                seasonRow[camelKey] = numValue;
              } else if (value && value.trim() !== '') {
                // Keep non-empty string values
                seasonRow[camelKey] = value;
              }
            }

            return seasonRow;
          })
          .filter(Boolean); // Remove null entries

      } catch (err) {
        console.warn(`Error parsing CSV for ${player_id}:`, err.message);
      }
    }

    // Add rookie year to player if found
    if (rookieYear) {
      player.rookieYear = rookieYear;
    }

    return { player, seasonRows };
  } catch (err) {
    console.warn(`Error processing player ${playerFolder}:`, err.message);
    return null;
  }
}

/**
 * Main transformation function
 */
function transformData() {
  console.log('Starting data transformation...');
  console.log(`Reading from: ${PLAYER_DATA_DIR}`);
  console.log(`Output to: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Get all player folders
  const folders = fs.readdirSync(PLAYER_DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  console.log(`Found ${folders.length} player folders`);

  const players = [];
  const seasonsByPosition = {
    QB: [],
    RB: [],
    WR: [],
    TE: []
  };

  let processedCount = 0;
  let skippedCount = 0;

  // Process each player
  for (const folder of folders) {
    const result = processPlayer(folder);

    if (result) {
      players.push(result.player);
      const position = result.player.position;
      seasonsByPosition[position].push(...result.seasonRows);
      processedCount++;

      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount} players...`);
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`\nProcessing complete!`);
  console.log(`- Processed: ${processedCount} players`);
  console.log(`- Skipped: ${skippedCount} players`);
  console.log(`- QB players: ${players.filter(p => p.position === 'QB').length}`);
  console.log(`- RB players: ${players.filter(p => p.position === 'RB').length}`);
  console.log(`- WR players: ${players.filter(p => p.position === 'WR').length}`);
  console.log(`- TE players: ${players.filter(p => p.position === 'TE').length}`);
  console.log(`- QB seasons: ${seasonsByPosition.QB.length}`);
  console.log(`- RB seasons: ${seasonsByPosition.RB.length}`);
  console.log(`- WR seasons: ${seasonsByPosition.WR.length}`);
  console.log(`- TE seasons: ${seasonsByPosition.TE.length}`);

  // Write output files
  console.log('\nWriting JSON files...');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'players.json'),
    JSON.stringify(players, null, 2)
  );
  console.log('✓ players.json written');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'seasons_qb.json'),
    JSON.stringify(seasonsByPosition.QB, null, 2)
  );
  console.log('✓ seasons_qb.json written');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'seasons_rb.json'),
    JSON.stringify(seasonsByPosition.RB, null, 2)
  );
  console.log('✓ seasons_rb.json written');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'seasons_wr.json'),
    JSON.stringify(seasonsByPosition.WR, null, 2)
  );
  console.log('✓ seasons_wr.json written');

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'seasons_te.json'),
    JSON.stringify(seasonsByPosition.TE, null, 2)
  );
  console.log('✓ seasons_te.json written');

  console.log('\n✨ Data transformation complete!');
}

// Run the transformation
try {
  transformData();
} catch (err) {
  console.error('Error during transformation:', err);
  process.exit(1);
}
