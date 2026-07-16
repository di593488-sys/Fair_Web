'use strict';

const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { getWithRetry } = require('../lib/http');
const { parseDateRange } = require('../lib/parse');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'COEX Magok';
const BASE_URL = 'https://coexmagok.co.kr';
// Scrape the homepage which shows upcoming exhibitions with dates + images.
// The /exhibitions/ list page returns 404; the /event-schedule/ is a JS calendar.
const LIST_URL = 'https://coexmagok.co.kr';

const HTTP_HEADERS = {
  'Referer': 'https://coexmagok.co.kr/',
};

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];

  try {
    const { data: html } = await getWithRetry(LIST_URL, { headers: HTTP_HEADERS });
    const $ = cheerio.load(html);
    const today = new Date().toISOString().slice(0, 10);

    // Confirmed structure on homepage:
    //   <a href="https://coexmagok.co.kr/exhibitions/SLUG/">
    //     <img src="https://coexmagok.co.kr/wp-content/uploads/.../img.png" alt="">
    //     <h4>TITLE</h4>
    //     2026.04.11 - 2026.04.12     ← text node with date
    //   </a>
    const seen = new Set();
    const items = $('a[href*="/exhibitions/"]');

    items.each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      if (!href || seen.has(href)) return;

      // Must contain an image and a heading to be a real card (not a nav link)
      const hasImage   = $el.find('img').length > 0;
      const hasHeading = $el.find('h2, h3, h4, h5, strong').length > 0;
      if (!hasImage || !hasHeading) return;

      const title = $el.find('h2, h3, h4, h5, strong').first().text().trim();
      if (!title) return;

      // Date is a text node inside the <a> — grab full text then parse
      const fullText = $el.text();
      const { start_date, end_date } = parseDateRange(fullText);
      if (!start_date || !end_date) return;

      const original_url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      seen.add(href);

      const imgSrc = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
      const image_url = imgSrc.startsWith('http') ? imgSrc
        : imgSrc ? `${BASE_URL}${imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc}`
        : '';

      results.push(buildItem({ title, start_date, end_date, original_url, today, image_url }));
    });

    console.log(`[${SOURCE}] Found ${results.length} items`);
  } catch (err) {
    console.error(`[${SOURCE}] Crawl failed: ${err.message}`);
  }

  return results;
}

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = 'COEX Magok', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue,
    location: '서울시 강서구 마곡동',
    start_date,
    end_date,
    fee: null,
    source: SOURCE,
    original_url,
    created_at: today,
  };
}

module.exports = { crawl };
