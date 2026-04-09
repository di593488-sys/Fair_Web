'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'BEXCO';
const BASE_URL = 'https://www.bexco.co.kr';
// Confirmed working URL — the old /kor/exhibitions/list returns 404
const LIST_URL = 'https://www.bexco.co.kr/kor/CMS/EventScheduleMgr/list.do?mCode=MN214';

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

    // Confirmed structure:
    //   <li>
    //     <a href="/kor/CMS/EventScheduleMgr/view.do?mCode=MN214&&event_seq=ID">
    //       <img src="...">
    //       <span class="badge">전시</span>
    //       <span class="title">TITLE</span>   (may also be strong — checked both)
    //       <span class="date">YYYY-MM-DD ~ YYYY-MM-DD</span>
    //       <span class="location">VENUE</span>
    //     </a>
    //   </li>
    // Use the detail href as the anchor since ul.list class doesn't appear in static HTML
    const itemLinks = $('a[href*="EventScheduleMgr/view.do"]');
    const seen = new Set();
    const items = itemLinks.map((_, el) => $(el).closest('li').get(0)).filter((_, el) => {
      if (!el) return false;
      const key = $(el).find('a[href*="EventScheduleMgr/view.do"]').first().attr('href') || '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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

function resolveImg($el, baseUrl) {
  const src = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src.startsWith('/') ? src : '/' + src}`;
}

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };
  // Format from site: "2026-04-09 ~ 2026-04-12"
  const m = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (m) return { start_date: normalizeDate(m[1]), end_date: normalizeDate(m[2]) };
  return { start_date: null, end_date: null };
}

module.exports = { crawl };
