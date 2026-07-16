'use strict';

const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { getWithRetry, sleep } = require('../lib/http');
const { parseDateRange, resolveImg } = require('../lib/parse');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'BEXCO';
const BASE_URL = 'https://www.bexco.co.kr';
// Confirmed working URL — the old /kor/exhibitions/list returns 404
const LIST_URL = 'https://www.bexco.co.kr/kor/CMS/EventScheduleMgr/list.do?mCode=MN214';

const HTTP_HEADERS = {
  'Referer': 'https://www.bexco.co.kr/',
};

// Confirmed via live check: list is sorted chronologically ascending and paginates
// via &page=N (hundreds of pages exist, reaching years into the future). Cap low —
// the nearest few pages already cover everything relevant to "current/upcoming".
const MAX_PAGES = 4;
const PAGE_DELAY_MS = 400;

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 ? LIST_URL : `${LIST_URL}&page=${page}`;
      const { data: html } = await getWithRetry(url, { headers: HTTP_HEADERS });
      const $ = cheerio.load(html);

      const itemLinks = $('a[href*="EventScheduleMgr/view.do"]');
      const seen = new Set();
      const items = itemLinks.map((_, el) => $(el).closest('li').get(0)).filter((_, el) => {
        if (!el) return false;
        const key = $(el).find('a[href*="EventScheduleMgr/view.do"]').first().attr('href') || '';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (items.length === 0) break; // no more pages

      items.each((_, el) => {
        const $el = $(el);

        const title = $el.find('span.title').first().text().trim()
          || $el.find('strong').first().text().trim();
        if (!title) return;

        const dateText = $el.find('span.date').first().text().trim();
        const { start_date, end_date } = parseDateRange(dateText);
        if (!start_date || !end_date) return;

        const venue = $el.find('span.location').first().text().trim() || 'BEXCO';

        const href = $el.find('a[href*="EventScheduleMgr/view.do"]').first().attr('href') || '';
        const original_url = href.startsWith('http') ? href
          : href ? `${BASE_URL}${href.startsWith('/') ? href : '/' + href}`
          : LIST_URL;

        const image_url = resolveImg($el, BASE_URL);
        results.push(buildItem({ title, start_date, end_date, original_url, today, image_url, venue }));
      });

      if (page < MAX_PAGES) await sleep(PAGE_DELAY_MS);
    }

    console.log(`[${SOURCE}] Found ${results.length} items`);
  } catch (err) {
    console.error(`[${SOURCE}] Crawl failed: ${err.message}`);
  }

  return results;
}

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = 'BEXCO', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue: venue || 'BEXCO',
    location: '부산시 해운대구 APEC로',
    start_date,
    end_date,
    fee: null,
    source: SOURCE,
    original_url,
    created_at: today,
  };
}

module.exports = { crawl };
