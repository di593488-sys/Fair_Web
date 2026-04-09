'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'COEX Magok';
const BASE_URL = 'https://coexmagok.co.kr';
// Scrape the homepage which shows upcoming exhibitions with dates + images.
// The /exhibitions/ list page returns 404; the /event-schedule/ is a JS calendar.
const LIST_URL = 'https://coexmagok.co.kr';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Referer': 'https://coexmagok.co.kr/',
};

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];

  try {
    const { data: html } = await axios.get(LIST_URL, {
      headers: HTTP_HEADERS,
      timeout: 15000,
    });
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

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };
  // Format from site: "2026.04.11 - 2026.04.12"
  const m = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (m) return { start_date: normalizeDate(m[1]), end_date: normalizeDate(m[2]) };
  return { start_date: null, end_date: null };
}

module.exports = { crawl };
