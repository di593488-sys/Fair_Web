'use strict';

// Official site: https://suwonmesse.com (confirmed 2026-07-16; the domain the
// crawler previously pointed at, blog.naver.com/suwonmesse, was never the
// official source — it also renders inside a cross-origin iframe and blocks
// programmatic access).
//
// The official event list (/event_schedule/event_list/) and calendar
// (/event_schedule/event_calendar/) are both rendered client-side by a Vue
// widget that fetches data through wp-admin/admin-ajax.php with a rotating
// nonce (fusion_login_nonce-style token minted per page load). There is no
// static HTML listing and no public REST endpoint exposing the same data
// (checked /wp-json/wp/v2/types — no event/exhibition post type registered).
// Reproducing the AJAX call would mean scraping the nonce out of a page load
// first and hoping the private action name stays stable — exactly the kind
// of brittle, JS-dependent scraping this project avoids in favor of
// Playwright-free static crawling. Returning [] gracefully so the other
// crawlers are not affected.
const SOURCE = 'Suwon Messe';

async function crawl() {
  console.log(`[${SOURCE}] Skipped — suwonmesse.com event list is AJAX/nonce-gated, not statically crawlable. Returning [].`);
  return [];
}

module.exports = { crawl };
