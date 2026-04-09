'use strict';

/**
 * Main crawl orchestrator.
 * Runs all site crawlers in parallel, validates, deduplicates, and writes
 * the result to /data/exhibitions.json at the repository root.
 *
 * Usage:
 *   node scripts/crawl.js
 *
 * If a single crawler fails it logs the error and continues — the final JSON
 * is always written as long as at least one crawler succeeds (or even if all fail,
 * an empty array is written so the frontend never receives a 404).
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

// Output path — must be inside public/ so Vite copies it to the build output.
// After the crawl workflow commits this file, the existing Vite build picks it up.
const OUTPUT_PATH = path.resolve(__dirname, '..', 'public', 'data', 'exhibitions.json');

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Fair Web Crawl Start ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Output:    ${OUTPUT_PATH}\n`);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  // Run all crawlers — failures are caught individually
  const crawlerResults = await Promise.allSettled(
    CRAWLERS.map(({ name, module: mod }) => runCrawler(name, mod))
  );

  // Collect all items
  let allItems = [];
  for (const result of crawlerResults) {
    if (result.status === 'fulfilled') {
      allItems = allItems.concat(result.value);
    }
    // Rejected crawlers already logged their errors inside runCrawler()
  }

  const totalCrawled = allItems.length;
  console.log(`\nTotal raw items collected:  ${totalCrawled}`);

  // Validate
  const validItems = validateExhibitions(allItems);
  const totalValid   = validItems.length;
  const totalInvalid = totalCrawled - totalValid;
  console.log(`Valid items after validation: ${totalValid}`);
  console.log(`Invalid items removed:        ${totalInvalid}`);

  // Deduplicate
  const uniqueItems = deduplicateExhibitions(validItems);
  const totalDeduped = totalValid - uniqueItems.length;
  console.log(`Deduplicated (removed):       ${totalDeduped}`);
  console.log(`Unique items remaining:       ${uniqueItems.length}`);

  // Sort by start_date ascending
  uniqueItems.sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Cap at MAX_ITEMS — prefer upcoming/ongoing over already-ended exhibitions
  const MAX_ITEMS = 50;
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = uniqueItems.filter(item => item.end_date >= today);
  const past     = uniqueItems.filter(item => item.end_date <  today);

  let finalItems;
  if (upcoming.length >= MAX_ITEMS) {
    // More upcoming than the cap — keep the soonest 50
    finalItems = upcoming.slice(0, MAX_ITEMS);
  } else {
    // Fill the remaining slots with the most recently ended past exhibitions
    const slots      = MAX_ITEMS - upcoming.length;
    // past is sorted asc; reverse gives most-recently-ended first
    const recentPast = past.slice().reverse().slice(0, slots);
    finalItems = [...upcoming, ...recentPast];
    finalItems.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  console.log(`\n── Crawl Summary ──────────────────────────────`);
  console.log(`  Total crawled:      ${totalCrawled}`);
  console.log(`  Total valid:        ${totalValid}`);
  console.log(`  Total invalid:      ${totalInvalid}`);
  console.log(`  Total deduplicated: ${totalDeduped}`);
  console.log(`  Final saved:        ${finalItems.length}  (cap: ${MAX_ITEMS})`);
  console.log(`───────────────────────────────────────────────`);

  // Guard: never overwrite the file with an empty result.
  // If all crawlers failed, keep the existing file so seed/previous data is preserved.
  if (finalItems.length === 0) {
    console.warn('\n⚠ No items collected — skipping file write to preserve existing data.');
    console.log('=== Fair Web Crawl Complete (no update) ===');
    return;
  }

  // Write output
  const json = JSON.stringify(finalItems, null, 2);
  fs.writeFileSync(OUTPUT_PATH, json, 'utf-8');
  console.log(`\n✓ Written ${finalItems.length} exhibitions to ${OUTPUT_PATH}`);
  console.log('=== Fair Web Crawl Complete ===');
}

/**
 * Safely runs one crawler module.
 * Always resolves — returns [] on failure.
 */
async function runCrawler(name, modulePath) {
  try {
    const { crawl } = require(modulePath);
    const items = await crawl();
    console.log(`[${name}] ✓ ${items.length} items`);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error(`[${name}] ✗ Failed: ${err.message}`);
    return [];
  }
}

main().catch(err => {
  console.error('Fatal error in crawl runner:', err);
  process.exit(1);
});
