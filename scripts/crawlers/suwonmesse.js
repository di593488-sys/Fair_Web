'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'Suwon Messe';
const BASE_URL = 'https://blog.naver.com/suwonmesse';
// Suwon Messe publishes schedules via Naver blog
const LIST_URL = 'https://blog.naver.com/suwonmesse';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
};

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];

  try {
    // Naver blog posts are rendered in an iframe — fetch the frame directly
    const { data: outerHtml } = await axios.get(LIST_URL, {
      headers: HTTP_HEADERS,
      timeout: 15000,
    });
    const $outer = cheerio.load(outerHtml);

    // Naver blog uses an iframe for content
    const frameUrl = $outer('#mainFrame').attr('src');
    const contentUrl = frameUrl
      ? (frameUrl.startsWith('http') ? frameUrl : `https://blog.naver.com${frameUrl}`)
      : null;

    const fetchUrl = contentUrl || LIST_URL;
    const { data: html } = await axios.get(fetchUrl, {
      headers: HTTP_HEADERS,
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    const today = new Date().toISOString().slice(0, 10);

    // Naver blog post list items
    const posts = $(
      '.post-item, .blog-post, .se-main-container, ' +
      '.post-title, .list_title, .tit_h3'
    );

    if (posts.length === 0) {
      // Try extracting dates from visible text in article lists
      $('a[href*="naver.com"], a[href*="PostView"]').each((_, anchor) => {
        const $a = $(anchor);
        const title = $a.text().trim();
        if (!title || title.length < 3) return;

        const parent = $a.closest('li, div.item, div.post');
        const dateText = $(parent).find('.date, .written, time, .se-date').first().text().trim() ||
          $(parent).text().match(/\d{4}[.\-]\d{1,2}[.\-]\d{1,2}/)?.[0] || '';

        const { start_date, end_date } = parseDateRange(dateText || $(parent).text());
        if (!start_date || !end_date) return;

        const href = $a.attr('href') || '';
        const original_url = href.startsWith('http') ? href : `https://blog.naver.com${href}`;
        results.push(buildItem({ title, start_date, end_date, original_url, today }));
      });
      return results;
    }

    posts.each((_, el) => {
      const $el = $(el);
      const title = $el.find('.title, .post-title, h3, a').first().text().trim();
      if (!title) return;

      const dateText = $el.find('.date, time, .written').first().text().trim() || '';
      const { start_date, end_date } = parseDateRange(dateText || $el.text());
      if (!start_date || !end_date) return;

      const href = $el.find('a').first().attr('href') || '';
      const original_url = href.startsWith('http') ? href : `https://blog.naver.com${href}`;
      const image_url = $el.find('img').first().attr('src') || '';

      results.push(buildItem({ title, start_date, end_date, original_url, today, image_url }));
    });

    console.log(`[${SOURCE}] Found ${results.length} items`);
  } catch (err) {
    console.error(`[${SOURCE}] Crawl failed: ${err.message}`);
  }

  return results;
}

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = '수원메쎄', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue,
    location: '경기도 수원시 영통구 광교로',
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
