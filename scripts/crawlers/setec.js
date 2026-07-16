'use strict';

const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { getWithRetry, sleep } = require('../lib/http');
const { parseDateRange, resolveImg } = require('../lib/parse');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'SETEC';
const BASE_URL = 'https://www.setec.or.kr';
// Confirmed working URL — the old /front/exhibition/exhibitionList.do returns 404
const LIST_URL = 'https://www.setec.or.kr/front/schedule/list.do';

const HTTP_HEADERS = {
  'Referer': 'https://www.setec.or.kr/',
};

// Confirmed via live check: site paginates with ?pageIndex=N (3 pages as of this writing).
// Cap higher than observed so future growth is picked up without unbounded crawling.
const MAX_PAGES = 6;
const PAGE_DELAY_MS = 400;

async function crawl() {
  console.log(`[${SOURCE}] Starting crawl from ${LIST_URL}`);
  const results = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 ? LIST_URL : `${LIST_URL}?pageIndex=${page}`;
      const { data: html } = await getWithRetry(url, { headers: HTTP_HEADERS });
      const $ = cheerio.load(html);

      // Confirmed structure: li > a[onclick="fn_view('ID')"] > div.img + div.txt > strong + ul > li(기간) + li(장소)
      const items = $('li').filter((_, el) => {
        const $li = $(el);
        return $li.find('strong').length > 0 && $li.find('img[src*="viewImg"]').length > 0;
      });

      if (items.length === 0) break; // no more pages

      items.each((_, el) => {
        const $el = $(el);
        const title = $el.find('strong').first().text().trim();
        if (!title) return;

        let dateText = '';
        let venue = 'SETEC';
        $el.find('li').each((_, node) => {
          const t = $(node).text().trim();
          if (t.includes('기간')) {
            dateText = t.replace(/기간\s*[：:]\s*/, '').trim();
          } else if (t.includes('장소')) {
            venue = t.replace(/장소\s*[：:]\s*/, '').trim().split(',')[0].trim() || 'SETEC';
          }
        });

        const { start_date, end_date } = parseDateRange(dateText);
        if (!start_date || !end_date) return;

        // onclick="fn_view('2257'); return false;"
        const onclickAttr = $el.find('a[onclick*="fn_view"]').first().attr('onclick') || '';
        const idMatch = onclickAttr.match(/fn_view\s*\(\s*['"]?(\d+)/);
        const original_url = idMatch
          ? `${BASE_URL}/front/schedule/view.do?sIdx=${idMatch[1]}`
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

function buildItem({ title, start_date, end_date, original_url, today, image_url = '', venue = 'SETEC', description = '' }) {
  return {
    id: uuidv5(`${original_url}::${start_date}`, NAMESPACE),
    title,
    image_url,
    description,
    venue: venue || 'SETEC',
    location: '서울시 강남구 도곡동',
    start_date,
    end_date,
    fee: null,
    source: SOURCE,
    original_url,
    created_at: today,
  };
}

module.exports = { crawl };
