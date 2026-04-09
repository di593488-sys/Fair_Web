'use strict';

// Suwon Messe publishes schedules only via blog.naver.com/suwonmesse.
// The Naver blog renders all content inside a cross-origin iframe and blocks
// programmatic access, making reliable static crawling impossible.
// This crawler returns an empty array gracefully so the other crawlers
// are not affected.

const SOURCE = 'Suwon Messe';

async function crawl() {
  console.log(`[${SOURCE}] Skipped — Naver blog is not statically crawlable (cross-origin iframe). Returning [].`);
  return [];
}

module.exports = { crawl };
