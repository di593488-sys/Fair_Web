'use strict';

const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { getWithRetry } = require('../lib/http');
const { parseDateRange, resolveImg } = require('../lib/parse');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'KINTEX';
const BASE_URL = 'https://www.kintex.com';
// Confirmed working URL — the old /kor/exhibition/list.do returns 400
const LIST_URL = 'https://www.kintex.com/web/ko/event/list.do';

const HTTP_HEADERS = {
  'Referer': 'https://www.kintex.com/web/ko/event/clist.do?searchType=11',
};

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];

  try {
    const { data: html } = await getWithRetry(LIST_URL, { headers: HTTP_HEADERS });
    const $ = cheerio.load(html);
    const today = new Date().toISOString().slice(0, 10);

    // Each event card: <a href="javascript:fnView('./view.do', EVENT_ID)"> ... </a>
    const items = $('a[href*="fnView"]');

    items.each((_, el) => {
      const $el = $(el);

      // Confirmed structure inside anchor:
      //   div.item-thumb > ... img ...
      //   div.item-info-wrap > div.item-subject + div.item-client + div.item-date
      const title = $el.find('.item-subject').first().text().trim();
      if (!title) return;

      // Extract event ID from href → build stable detail URL
      const href = $el.attr('href') || '';
      const idMatch = href.match(/fnView\s*\([^,]+,\s*(\d+)/);
      const original_url = idMatch
        ? `${BASE_URL}/web/ko/event/view.do?seq=${idMatch[1]}`
        : LIST_URL;

      const dateText = $el.find('.item-date').first().text().trim();
      const venue = $el.find('.item-client').first().text().replace(/\s+/g, ' ').trim().split(',')[0].trim() || 'KINTEX';

      const { start_date, end_date } = parseDateRange(dateText);
      if (!start_date || !end_date) return;

      const image_url = resolveImg($el, BASE_URL);
      results.push(buildItem({ title, start_date, end_date, original_url, today, image_url, venue }));
    });

    console.log(`[${SOURCE}] Found ${results.length} items`);
  } catch (err) {
    console.error(`[${SOURCE}] Crawl failed: ${err.message}`);
  }

  return results;
}

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = 'KINTEX', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue: venue || 'KINTEX',
    location: '경기도 고양시 일산서구',
    start_date,
    end_date,
    fee: null,
    source: SOURCE,
    original_url,
    created_at: today,
  };
}

module.exports = { crawl };
