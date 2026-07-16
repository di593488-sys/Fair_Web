'use strict';

/**
 * Main crawl orchestrator.
 * Runs all site crawlers in parallel, validates, deduplicates, and writes
 * the result to /public/data/exhibitions.json plus a /public/data/crawl-meta.json
 * status file, at the repository root.
 *
 * Usage:
 *   node scripts/crawl.js
 *
 * If a single crawler fails it logs the error and continues — the final JSON
 * is written as long as at least one crawler produced valid data. If every
 * crawler comes back empty, the existing exhibitions.json is left untouched
 * and the process exits non-zero so the GitHub Actions run is visibly marked
 * as failed instead of silently "succeeding" with stale data.
 */

const path = require('path');
const fs = require('fs');
const { validateExhibitions, deduplicateExhibitions } = require('./validate');

// ── Crawler registry ─────────────────────────────────────────────────────────
const CRAWLERS = [
  { name: 'KINTEX',      module: './crawlers/kintex' },
  { name: 'COEX',        module: './crawlers/coex' },
  { name: 'SETEC',       module: './crawlers/setec' },
  { name: 'BEXCO',       module: './crawlers/bexco' },
  { name: 'Suwon Messe', module: './crawlers/suwonmesse' },
  { name: 'COEX Magok',  module: './crawlers/coexmagok' },
];

const MAX_ITEMS = 50;

// Output paths — must be inside public/ so Vite copies them to the build output.
const DATA_DIR     = path.resolve(__dirname, '..', 'public', 'data');
const OUTPUT_PATH  = path.join(DATA_DIR, 'exhibitions.json');
const META_PATH    = path.join(DATA_DIR, 'crawl-meta.json');

function nowKST() {
  // en-CA gives YYYY-MM-DD; combined with the KST offset this is an
  // unambiguous, human-sortable ISO-like timestamp for the meta file.
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(' ', 'T') + '+09:00';
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Fair Web Crawl Start ===');
  console.log(`Timestamp: ${new Date().toISOString()} (${nowKST()})`);
  console.log(`Output:    ${OUTPUT_PATH}\n`);

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Run all crawlers — failures are caught individually inside runCrawler().
  const perCrawler = await Promise.all(
    CRAWLERS.map(({ name, module: mod }) => runCrawler(name, mod))
  );

  let allItems = [];
  const successfulSources = [];
  const failedSources = [];
  for (const { name, items, error } of perCrawler) {
    allItems = allItems.concat(items);
    if (error) {
      failedSources.push(`${name} (${error})`);
      console.log(`[${name}] failed: ${error}`);
    } else if (items.length === 0) {
      failedSources.push(`${name} (0 items)`);
      console.log(`[${name}] failed: selector returned 0`);
    } else {
      successfulSources.push(name);
      console.log(`[${name}] success: ${items.length}`);
    }
  }

  const totalCrawled = allItems.length;

  // Validate
  const validItems   = validateExhibitions(allItems);
  const totalValid    = validItems.length;
  const totalInvalid  = totalCrawled - totalValid;

  // Deduplicate
  const uniqueItems  = deduplicateExhibitions(validItems);
  const totalDeduped = totalValid - uniqueItems.length;

  // Drop exhibitions that have already ended — only ongoing/upcoming ship by default.
  const today = new Date().toISOString().slice(0, 10);
  const current = uniqueItems.filter(item => item.end_date >= today);
  const totalEnded = uniqueItems.length - current.length;

  // Sort ascending by start_date. Because ongoing exhibitions always have a
  // start_date <= today and upcoming ones have start_date > today, this
  // ordering already puts "진행 중" before "예정 (soonest first)" for free.
  current.sort((a, b) => a.start_date.localeCompare(b.start_date));

  const finalItems = current.slice(0, MAX_ITEMS);

  console.log(`\n[SUMMARY] crawled=${totalCrawled} valid=${totalValid} duplicate=${totalDeduped} ended=${totalEnded} final=${finalItems.length}`);
  if (failedSources.length > 0) {
    console.log(`[SUMMARY] failed sources: ${failedSources.join(', ')}`);
  }

  // Load previous meta (if any) so last_success_at can be carried forward
  // when this run doesn't produce a fresh success.
  let previousMeta = {};
  try {
    previousMeta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  } catch {
    // No previous meta file — fine on first run.
  }

  const attemptTimestamp = nowKST();

  // Guard: never overwrite exhibitions.json with an empty result.
  // If every crawler failed or produced zero usable items, keep the existing
  // file (protecting the last known-good data) and fail the run loudly.
  if (finalItems.length === 0) {
    const meta = {
      last_attempt_at: attemptTimestamp,
      last_success_at: previousMeta.last_success_at ?? null,
      total_count: previousMeta.total_count ?? 0,
      successful_sources: successfulSources,
      failed_sources: failedSources,
    };
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');

    console.error('\n✗ No usable items collected from any source — exhibitions.json left unchanged.');
    console.error('=== Fair Web Crawl FAILED ===');
    process.exit(1);
  }

  // Write exhibitions.json
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalItems, null, 2), 'utf-8');
  console.log(`\n✓ Written ${finalItems.length} exhibitions to ${OUTPUT_PATH}`);

  // Write crawl-meta.json
  const meta = {
    last_attempt_at: attemptTimestamp,
    last_success_at: attemptTimestamp,
    total_count: finalItems.length,
    successful_sources: successfulSources,
    failed_sources: failedSources,
  };
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`✓ Written crawl metadata to ${META_PATH}`);

  console.log('=== Fair Web Crawl Complete ===');
}

/**
 * Safely runs one crawler module.
 * Always resolves — never throws — so one bad crawler can't stop the others.
 */
async function runCrawler(name, modulePath) {
  try {
    const { crawl } = require(modulePath);
    const items = await crawl();
    return { name, items: Array.isArray(items) ? items : [], error: null };
  } catch (err) {
    console.error(`[${name}] ✗ Crawler threw: ${err.message}`);
    return { name, items: [], error: err.message };
  }
}

main().catch(err => {
  console.error('Fatal error in crawl runner:', err);
  process.exit(1);
});
