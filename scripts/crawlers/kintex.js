'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'KINTEX';
const BASE_URL = 'https://www.kintex.com';
// Exhibition schedule listing URL — update selector if the site changes
const LIST_URL = 'https://www.kintex.com/kor/exhibition/list.do';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml;q=0.9,*/*;q=0.8',
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

    // KINTEX typically renders exhibition cards with class .exhbList or similar
    // Selectors below cover common patterns — adjust if the HTML changes
    const items = $('.exhbList li, .exhibition-list li, .list-item, .exhb-item, .event-item');

    if (items.length === 0) {
      console.warn(`[${SOURCE}] No items found with primary selectors, trying fallback…`);
      // Fallback: try table rows
      $('table tbody tr').each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        const title = cells.eq(0).text().trim() || cells.eq(1).text().trim();
        const dateText = cells.eq(1).text().trim() || cells.eq(2).text().trim();
        const link = $(row).find('a').attr('href');
        if (!title) return;

        const { start_date, end_date } = parseDateRange(dateText);
        if (!start_date || !end_date) return;

        const original_url = link
          ? link.startsWith('http') ? link : `${BASE_URL}${link}`
          : LIST_URL;

        results.push(buildItem({ title, start_date, end_date, original_url, today }));
      });
      return results;
    }

    items.each((_, el) => {
      const $el = $(el);
      const title =
        $el.find('.exhb-title, .title, h3, h4, .name, strong').first().text().trim() ||
        $el.find('a').first().text().trim();
      if (!title) return;

      const dateText =
        $el.find('.exhb-date, .date, .period, .schedule, time').first().text().trim();
      const { start_date, end_date } = parseDateRange(dateText);
      if (!start_date || !end_date) return;

      const linkHref = $el.find('a').first().attr('href') || '';
      const original_url = linkHref.startsWith('http')
        ? linkHref
        : linkHref ? `${BASE_URL}${linkHref}` : LIST_URL;

      const image_url =
        $el.find('img').first().attr('src') ||
        $el.find('img').first().attr('data-src') || '';
      const normalizedImage = image_url.startsWith('http')
        ? image_url
        : image_url ? `${BASE_URL}${image_url}` : '';

      const venue =
        $el.find('.hall, .venue, .location, .place').first().text().trim() ||
        'KINTEX';

      const description =
        $el.find('.desc, .summary, .exhb-desc, p').first().text().trim() || '';

      results.push(
        buildItem({ title, start_date, end_date, original_url, today, image_url: normalizedImage, venue, description })
      );
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

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };

  // Pattern: 2024.01.15 ~ 2024.01.20 or 2024-01-15 ~ 2024-01-20
  const rangeMatch = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (rangeMatch) {
    return {
      start_date: normalizeDate(rangeMatch[1]),
      end_date: normalizeDate(rangeMatch[2]),
    };
  }

  // Pattern: 24.01.15 ~ 24.01.20
  const shortRange = text.match(/(\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{2}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (shortRange) {
    return {
      start_date: normalizeDate(shortRange[1]),
      end_date: normalizeDate(shortRange[2]),
    };
  }

  return { start_date: null, end_date: null };
}

module.exports = { crawl };
