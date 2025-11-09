#!/usr/bin/env python3
"""
Pro-Football-Reference Career Statistics Scraper
Extracts season-level stats for NFL players, including tables hidden in HTML comments.
"""

import argparse
import json
import re
import time
import random
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from urllib.parse import urlparse

import requests
import cloudscraper
from bs4 import BeautifulSoup, Comment, Tag
import pandas as pd


class PFRScraper:
    """Scraper for Pro-Football-Reference player statistics."""

    def __init__(self, base_delay: float = 1.2, max_retries: int = 6):
        self.base_delay = base_delay
        self.max_retries = max_retries
        self.request_count = 0
        self.session_refresh_interval = 12  # Recreate session every 12 requests (conservative for overnight)
        self._create_new_session()

    def _create_new_session(self):
        """Create a fresh cloudscraper session to avoid detection."""
        self.session = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            }
        )
        self.request_count = 0

    def read_urls(self, path: Path) -> List[str]:
        """Read URLs from file, one per line."""
        with open(path, 'r', encoding='utf-8') as f:
            urls = [line.strip() for line in f if line.strip()]
        return urls

    def player_id_from_url(self, url: str) -> str:
        """Extract player ID from URL.
        Example: https://www.pro-football-reference.com/players/K/KuppCo00.htm -> KuppCo00
        """
        path = urlparse(url).path
        match = re.search(r'/players/[A-Z]/([A-Za-z0-9]+)\.htm', path)
        if match:
            return match.group(1)
        raise ValueError(f"Could not extract player ID from URL: {url}")

    def fetch_with_retry(self, url: str) -> Optional[str]:
        """Fetch URL with exponential backoff retry logic."""
        # Rotate session periodically to avoid detection
        if self.request_count >= self.session_refresh_interval:
            print("  [Session rotation - creating fresh session]")
            self._create_new_session()
            # Add extra delay after session rotation
            time.sleep(random.uniform(5, 10))

        consecutive_429s = 0  # Track consecutive rate limits

        for attempt in range(self.max_retries):
            try:
                # Human-like delays with large variation
                if attempt == 0:
                    # First attempt: base delay + substantial random component
                    delay = self.base_delay + random.uniform(3.0, 8.0)
                else:
                    # Retries: exponential backoff with large variation
                    delay = (2 ** attempt) * 3 + random.uniform(2, 8)
                    print(f"  Retry {attempt}/{self.max_retries} after {delay:.1f}s delay...")

                time.sleep(delay)

                self.request_count += 1
                response = self.session.get(url, timeout=30)

                if response.status_code == 200:
                    return response.text
                elif response.status_code == 429:
                    print(f"  Rate limited (429), backing off and rotating session...")
                    # Rotate session on rate limit
                    self._create_new_session()
                    # Extra long delay when rate limited
                    extra_delay = random.uniform(10, 20)
                    time.sleep(extra_delay)
                    continue
                elif response.status_code == 503:
                    print(f"  Service unavailable (503), retrying...")
                    continue
                elif response.status_code == 404:
                    print(f"  Player page not found (404)")
                    return None
                else:
                    print(f"  HTTP {response.status_code}")
                    continue

            except requests.Timeout:
                print(f"  Request timeout, retrying...")
                continue
            except requests.RequestException as e:
                print(f"  Request error: {e}")
                continue

        print(f"  Failed after {self.max_retries} retries")
        return None

    def extract_all_tables(self, soup: BeautifulSoup) -> List[Tag]:
        """Extract all tables, including those hidden in HTML comments (critical for PFR)."""
        tables = []

        # Get regular tables
        tables.extend(soup.find_all('table'))

        # CRITICAL: Get tables inside HTML comments (PFR-specific behavior)
        for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
            try:
                # Use html.parser to avoid warnings about markup vs filenames
                comment_soup = BeautifulSoup(comment, 'html.parser')
                tables.extend(comment_soup.find_all('table'))
            except Exception:
                # Skip malformed comments
                continue

        return tables

    def parse_table_to_rows(self, table: Tag, player_id: str) -> Tuple[str, List[Dict], List[str]]:
        """Parse HTML table to list of dicts.
        Returns: (table_id, rows, column_names)
        """
        table_id = table.get('id', 'unknown_table')

        # Extract headers
        headers = []
        thead = table.find('thead')
        if thead:
            # Handle multi-row headers (take last row which has actual column names)
            header_rows = thead.find_all('tr')
            if header_rows:
                last_header_row = header_rows[-1]
                for th in last_header_row.find_all(['th', 'td']):
                    # Get text or data-stat attribute
                    col_name = th.get('data-stat', th.get_text(strip=True))
                    if col_name:
                        headers.append(col_name)

        # Extract data rows
        rows = []
        tbody = table.find('tbody')
        if tbody:
            for tr in tbody.find_all('tr'):
                # Skip header rows within tbody
                if tr.get('class') and 'thead' in tr.get('class'):
                    continue

                row_data = {}
                cells = tr.find_all(['th', 'td'])

                for i, cell in enumerate(cells):
                    col_name = cell.get('data-stat', headers[i] if i < len(headers) else f'col_{i}')
                    value = cell.get_text(strip=True)
                    row_data[col_name] = value

                if row_data:
                    rows.append(row_data)

        return table_id, rows, headers

    def is_seasonal_table(self, rows: List[Dict], headers: List[str]) -> bool:
        """Check if table contains season-by-season stats (not career summary or bio).
        Heuristic: ≥3 rows, contains Year/Season/Age column.
        """
        if len(rows) < 3:
            return False

        # Check for season indicators in columns
        season_indicators = {'year', 'season', 'age'}
        header_lower = {h.lower() for h in headers}

        return bool(season_indicators & header_lower)

    def extract_player_metadata(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract player name and position from page."""
        metadata = {'player_name': '', 'position': ''}

        # Player name (usually in h1 tag)
        h1 = soup.find('h1')
        if h1:
            metadata['player_name'] = h1.get_text(strip=True)

        # Position (look in meta info or bio section)
        # Try meta div first
        meta_div = soup.find('div', {'id': 'meta'})
        if meta_div:
            # Look for "Position:" label
            for p in meta_div.find_all('p'):
                text = p.get_text()
                if 'Position:' in text:
                    # Extract position after "Position:"
                    match = re.search(r'Position:\s*([A-Z]+)', text)
                    if match:
                        metadata['position'] = match.group(1)
                        break

        return metadata

    def save_csv(self, player_id: str, table_id: str, rows: List[Dict],
                 metadata: Dict[str, str], output_dir: Path) -> Path:
        """Save table data to CSV file."""
        # Create player directory
        player_dir = output_dir / player_id
        player_dir.mkdir(exist_ok=True)

        # Add player metadata to each row
        for row in rows:
            row['player_id'] = player_id
            row['player_name'] = metadata.get('player_name', '')
            row['position'] = metadata.get('position', '')

        # Convert to DataFrame
        df = pd.DataFrame(rows)

        # Reorder columns (player metadata first)
        meta_cols = ['player_id', 'player_name', 'position']
        other_cols = [col for col in df.columns if col not in meta_cols]
        df = df[meta_cols + other_cols]

        # Save to CSV
        csv_path = player_dir / f"{player_id}__{table_id}.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8')

        return csv_path

    def save_xlsx(self, player_id: str, all_tables: Dict[str, pd.DataFrame],
                  output_dir: Path) -> Path:
        """Save all tables to single XLSX file with multiple sheets."""
        player_dir = output_dir / player_id
        player_dir.mkdir(exist_ok=True)

        xlsx_path = player_dir / f"{player_id}.xlsx"

        with pd.ExcelWriter(xlsx_path, engine='openpyxl') as writer:
            for table_id, df in all_tables.items():
                # Sheet names max 31 chars
                sheet_name = table_id[:31]
                df.to_excel(writer, sheet_name=sheet_name, index=False)

        return xlsx_path

    def save_metadata(self, player_id: str, metadata: Dict, table_count: int,
                     output_dir: Path) -> Path:
        """Save completion metadata JSON."""
        player_dir = output_dir / player_id
        player_dir.mkdir(exist_ok=True)

        done_data = {
            'player_id': player_id,
            'player_name': metadata.get('player_name', ''),
            'position': metadata.get('position', ''),
            'table_count': table_count,
            'timestamp': datetime.now().isoformat(),
        }

        done_path = player_dir / '_done.json'
        with open(done_path, 'w', encoding='utf-8') as f:
            json.dump(done_data, f, indent=2)

        return done_path

    def is_completed(self, player_id: str, output_dir: Path) -> bool:
        """Check if player has already been processed."""
        done_path = output_dir / player_id / '_done.json'
        return done_path.exists()

    def process_url(self, url: str, output_dir: Path,
                   enable_xlsx: bool = False, force: bool = False) -> Dict:
        """Process a single player URL.
        Returns: status dict for manifest
        """
        try:
            player_id = self.player_id_from_url(url)
        except ValueError as e:
            return {
                'url': url,
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

        # Check if already completed
        if not force and self.is_completed(player_id, output_dir):
            return {
                'url': url,
                'player_id': player_id,
                'status': 'skipped',
                'reason': 'already_completed',
                'timestamp': datetime.now().isoformat(),
            }

        print(f"Processing {player_id}...")

        # Fetch page
        html = self.fetch_with_retry(url)
        if html is None:
            return {
                'url': url,
                'player_id': player_id,
                'status': 'failed',
                'error': 'fetch_failed',
                'timestamp': datetime.now().isoformat(),
            }

        # Parse HTML
        soup = BeautifulSoup(html, 'lxml')

        # Extract player metadata
        metadata = self.extract_player_metadata(soup)

        # Extract all tables (including from comments!)
        all_tables = self.extract_all_tables(soup)

        # Process tables
        saved_tables = []
        tables_for_xlsx = {}

        for table in all_tables:
            table_id, rows, headers = self.parse_table_to_rows(table, player_id)

            # Only save seasonal tables
            if not self.is_seasonal_table(rows, headers):
                continue

            # Save CSV
            csv_path = self.save_csv(player_id, table_id, rows, metadata, output_dir)
            saved_tables.append(table_id)
            print(f"  [+] Saved {table_id} ({len(rows)} rows)")

            # Prepare for XLSX if enabled
            if enable_xlsx:
                df = pd.read_csv(csv_path)
                tables_for_xlsx[table_id] = df

        # Save XLSX if enabled and we have tables
        if enable_xlsx and tables_for_xlsx:
            self.save_xlsx(player_id, tables_for_xlsx, output_dir)
            print(f"  [+] Saved consolidated XLSX")

        # Save metadata
        if saved_tables:
            self.save_metadata(player_id, metadata, len(saved_tables), output_dir)

        return {
            'url': url,
            'player_id': player_id,
            'player_name': metadata.get('player_name', ''),
            'position': metadata.get('position', ''),
            'status': 'ok' if saved_tables else 'no_tables',
            'table_count': len(saved_tables),
            'tables': saved_tables,
            'timestamp': datetime.now().isoformat(),
        }

    def update_manifest(self, result: Dict, manifest_path: Path):
        """Append result to manifest file (JSONL format)."""
        with open(manifest_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(result) + '\n')


def main():
    parser = argparse.ArgumentParser(
        description='Scrape NFL player career statistics from Pro-Football-Reference'
    )
    parser.add_argument('--urls', required=True, type=Path,
                       help='Path to file containing player URLs (one per line)')
    parser.add_argument('--out', required=True, type=Path,
                       help='Output directory for scraped data')
    parser.add_argument('--workers', type=int, default=1,
                       help='Number of concurrent workers (default: 1, recommended for overnight runs)')
    parser.add_argument('--delay', type=float, default=10.0,
                       help='Base delay between requests in seconds (default: 10.0)')
    parser.add_argument('--batch-size', type=int, default=15,
                       help='Number of players to process before taking a break (default: 15)')
    parser.add_argument('--batch-delay', type=int, default=600,
                       help='Delay between batches in seconds (default: 600 = 10 minutes)')
    parser.add_argument('--xlsx', action='store_true',
                       help='Generate consolidated XLSX files (slower)')
    parser.add_argument('--force', action='store_true',
                       help='Reprocess already-completed players')

    args = parser.parse_args()

    # Setup
    output_dir = args.out.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / '_manifest.jsonl'

    # Initialize scraper
    scraper = PFRScraper(base_delay=args.delay)

    # Read URLs
    print(f"Reading URLs from {args.urls}...")
    urls = scraper.read_urls(args.urls)
    print(f"Found {len(urls)} player URLs\n")

    # Process URLs in batches (overnight mode)
    print(f"Starting OVERNIGHT scraper...")
    print(f"Output directory: {output_dir}")
    print(f"Manifest file: {manifest_path}")
    print(f"Batch size: {args.batch_size} players")
    print(f"Batch delay: {args.batch_delay}s (~{args.batch_delay//60} minutes)")
    print(f"Base delay per player: {args.delay}s + random variation")
    print(f"Estimated time per player: ~{args.delay + 5}-{args.delay + 15} seconds\n")

    results = {
        'ok': 0,
        'failed': 0,
        'skipped': 0,
        'no_tables': 0,
    }

    start_time = datetime.now()
    batch_num = 0

    # Process in batches
    for batch_start in range(0, len(urls), args.batch_size):
        batch_end = min(batch_start + args.batch_size, len(urls))
        batch_urls = urls[batch_start:batch_end]
        batch_num += 1

        print(f"\n{'='*70}")
        print(f"BATCH {batch_num}: Processing players {batch_start + 1}-{batch_end} of {len(urls)}")
        print(f"{'='*70}\n")

        # Process this batch (single-threaded if workers=1, otherwise use thread pool)
        if args.workers == 1:
            # Sequential processing for maximum politeness
            for i, url in enumerate(batch_urls, 1):
                result = scraper.process_url(url, output_dir, args.xlsx, args.force)
                scraper.update_manifest(result, manifest_path)

                status = result['status']
                results[status] = results.get(status, 0) + 1

                # Progress update within batch
                global_index = batch_start + i
                if i % 5 == 0 or i == len(batch_urls):
                    elapsed = (datetime.now() - start_time).total_seconds()
                    rate = global_index / max(elapsed / 60, 1)  # players per minute
                    remaining = len(urls) - global_index
                    eta_minutes = remaining / max(rate, 0.1)

                    print(f"\n[Batch {batch_num} Progress: {i}/{len(batch_urls)}]")
                    print(f"Overall: {global_index}/{len(urls)} | "
                          f"OK: {results['ok']} | "
                          f"Failed: {results['failed']} | "
                          f"Skipped: {results['skipped']}")
                    print(f"Rate: {rate:.2f} players/min | ETA: {eta_minutes:.0f} minutes\n")
        else:
            # Multi-threaded (not recommended for overnight, but supported)
            with ThreadPoolExecutor(max_workers=args.workers) as executor:
                futures = {
                    executor.submit(
                        scraper.process_url, url, output_dir, args.xlsx, args.force
                    ): url for url in batch_urls
                }

                for future in as_completed(futures):
                    result = future.result()
                    scraper.update_manifest(result, manifest_path)
                    status = result['status']
                    results[status] = results.get(status, 0) + 1

        # Batch complete - take a break before next batch (unless this is the last batch)
        if batch_end < len(urls):
            print(f"\n{'='*70}")
            print(f"BATCH {batch_num} COMPLETE - Taking {args.batch_delay}s ({args.batch_delay//60} min) break...")
            print(f"Stats so far: OK={results['ok']} | Failed={results['failed']} | Skipped={results['skipped']}")
            print(f"{'='*70}\n")
            time.sleep(args.batch_delay)

    # Final summary
    print("\n" + "="*60)
    print("SCRAPING COMPLETE")
    print("="*60)
    print(f"Total URLs processed: {len(urls)}")
    print(f"  [+] Successful:       {results['ok']}")
    print(f"  [ ] No tables found:  {results['no_tables']}")
    print(f"  [-] Failed:           {results['failed']}")
    print(f"  [~] Skipped:          {results['skipped']}")
    print(f"\nManifest: {manifest_path}")
    print("="*60)


if __name__ == '__main__':
    main()
