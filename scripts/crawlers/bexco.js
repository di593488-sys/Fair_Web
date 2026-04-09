'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'BEXCO';
const BASE_URL = 'https://www.bexco.co.kr';
const LIST_URL = 'https://www.bexco.co.kr/kor/exhibitions/list';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Referer': 'https://www.bexco.co.kr/',
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

    // BEXCO exhibition list selectors
    const items = $(
      '.exhibition-list li, .exhb-list-item, .event-item, ' +
      '.fair-list li, .list-item, .board-list tr'
    );

    if (items.length === 0) {
      console.warn(`[${SOURCE}] No items found, trying table rows…`);
      $('table tbody tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        if (cells.length < 2) return;

        const title = $row.find('a').first().text().trim() || cells.eq(1).text().trim();
        if (!title) return;

        // Try to find date in any cell
        let dateText = '';
        cells.each((_, cell) => {
          const t = $(cell).text().trim();
          if (/\d{4}[.\-]\d{1,2}[.\-]\d{1,2}/.test(t)) dateText = t;
        });

        const { start_date, end_date } = parseDateRange(dateText);
        if (!start_date || !end_date) return;

        const href = $row.find('a').first().attr('href') || '';
        const original_url = href.startsWith('http') ? href : href ? `${BASE_URL}${href}` : LIST_URL;
        results.push(buildItem({ title, start_date, end_date, original_url, today }));
      });
      return results;
    }

    items.each((_, el) => {
      const $el = $(el);

      const title =
        $el.find('.title, .name, h3, h4, strong, a').first().text().trim();
      if (!title) return;

      const dateText =
        $el.find('.date, .period, .term, time, .schedule').first().text().trim() || '';

      const { start_date, end_date } = parseDateRange(dateText || $el.text());
      if (!start_date || !end_date) return;

      const href = $el.find('a').first().attr('href') || '';
      const original_url = href.startsWith('http') ? href : href ? `${BASE_URL}${href}` : LIST_URL;

      const image_url = resolveImg($, $el, BASE_URL);
      const hall = $el.find('.hall, .venue, .place, .location').first().text().trim();
      const venue = hall ? `BEXCO ${hall}` : 'BEXCO';
      const description = $el.find('.desc, .summary, p').first().text().trim() || '';

      results.push(buildItem({ title, start_date, end_date, original_url, today, image_url, venue, description }));
    });

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

function resolveImg($, $el, baseUrl) {
  const src = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src}`;
}

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };
  const rangeMatch = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (rangeMatch) {
    return { start_date: normalizeDate(rangeMatch[1]), end_date: normalizeDate(rangeMatch[2]) };
  }
  const shortRange = text.match(/(\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (shortRange) {
    return { start_date: normalizeDate(shortRange[1]), end_date: normalizeDate(shortRange[2]) };
  }
  return { start_date: null, end_date: null };
}

module.exports = { crawl };
