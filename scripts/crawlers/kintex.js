'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'KINTEX';
const BASE_URL = 'https://www.kintex.com';
// Confirmed working URL — the old /kor/exhibition/list.do returns 400
const LIST_URL = 'https://www.kintex.com/web/ko/event/list.do';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Referer': 'https://www.kintex.com/web/ko/event/clist.do?searchType=11',
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

function resolveImg($el, baseUrl) {
  const src = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src.startsWith('/') ? src : '/' + src}`;
}

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };
  const m = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (m) return { start_date: normalizeDate(m[1]), end_date: normalizeDate(m[2]) };
  return { start_date: null, end_date: null };
}

module.exports = { crawl };
