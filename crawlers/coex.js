'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../scripts/validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'COEX';
const BASE_URL = 'https://www.coex.co.kr';
const LIST_URL = 'https://www.coex.co.kr/exhibitions';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
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

    // COEX exhibition card selectors
    const items = $(
      '.exhibition-item, .exhb-card, .event-card, .list-card, ' +
      '.exhibit-list-item, article.exhibition, .event-list-item'
    );

    if (items.length === 0) {
      // Fallback: look for any anchor with date nearby
      console.warn(`[${SOURCE}] No items with primary selectors, trying fallback table/list…`);
      $('ul.list li, .board-list tr, tbody tr').each((_, row) => {
        const $row = $(row);
        const title = $row.find('a, .title, .subject').first().text().trim();
        if (!title) return;
        const dateText = $row.find('.date, .period, td').last().text().trim();
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
        $el.find('.title, h2, h3, h4, .name, .subject, strong').first().text().trim() ||
        $el.find('a').first().text().trim();
      if (!title) return;

      const dateText =
        $el.find('.date, .period, .schedule, time, .term').first().text().trim();
      const { start_date, end_date } = parseDateRange(dateText);
      if (!start_date || !end_date) return;

      const href = $el.find('a').first().attr('href') || '';
      const original_url = href.startsWith('http') ? href : href ? `${BASE_URL}${href}` : LIST_URL;

      const image_url = resolveImage($, $el, BASE_URL);

      const venue =
        $el.find('.hall, .venue, .place, .location').first().text().trim() || 'COEX';

      const description =
        $el.find('.desc, .summary, p').first().text().trim() || '';

      results.push(
        buildItem({ title, start_date, end_date, original_url, today, image_url, venue, description })
      );
    });

    console.log(`[${SOURCE}] Found ${results.length} items`);
  } catch (err) {
    console.error(`[${SOURCE}] Crawl failed: ${err.message}`);
  }

  return results;
}

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = 'COEX', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue: venue || 'COEX',
    location: '서울시 강남구 삼성동',
    start_date,
    end_date,
    fee: null,
    source: SOURCE,
    original_url,
    created_at: today,
  };
}

function resolveImage($, $el, baseUrl) {
  const src =
    $el.find('img').first().attr('src') ||
    $el.find('img').first().attr('data-src') ||
    $el.find('[style*="background-image"]').first().attr('style') || '';

  if (src.startsWith('http')) return src;
  if (src.startsWith('/')) return `${baseUrl}${src}`;

  // Extract from inline background-image style
  const bgMatch = src.match(/url\(['"]?(.+?)['"]?\)/);
  if (bgMatch) {
    const url = bgMatch[1];
    return url.startsWith('http') ? url : `${baseUrl}${url}`;
  }
  return '';
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
