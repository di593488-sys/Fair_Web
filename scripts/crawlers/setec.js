'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { normalizeDate } = require('../validate');

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const SOURCE = 'SETEC';
const BASE_URL = 'https://www.setec.or.kr';
// Confirmed working URL — the old /front/exhibition/exhibitionList.do returns 404
const LIST_URL = 'https://www.setec.or.kr/front/schedule/list.do';

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
  'Referer': 'https://www.setec.or.kr/',
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
    //   <ul>
    //     <li>
    //       <a href="#">
    //         <img src="/file/viewImg.do?fIdx=3674" alt="TITLE">
    //         <span>186</span>              ← sequence number (used for detail URL)
    //         <strong>TITLE</strong>
    //         <span>기간 : YYYY-MM-DD ~ YYYY-MM-DD</span>
    //         <span>장소 : HALL, HALL</span>
    //       </a>
    //     </li>
    //   </ul>
    // Structure: ul > li > (img + strong(title) + p/span(기간) + p/span(장소))
    // exhibit_list class not confirmed in static HTML — use broad li filter
    const items = $('li').filter((_, el) => {
      const $li = $(el);
      return $li.find('strong').length > 0 && $li.find('img[src*="viewImg"]').length > 0;
    });

    items.each((_, el) => {
      const $el = $(el);

      const title = $el.find('strong').first().text().trim();
      if (!title) return;

      // Confirmed structure:
      //   li > a[onclick="fn_view('ID')"] > div.img + div.txt > strong + ul > li(기간) + li(장소)
      let dateText = '';
      let venue = 'SETEC';

      // Date and venue are in nested <li> elements inside div.txt > ul
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

      // Extract seq ID from onclick="fn_view('2257'); return false;"
      const onclickAttr = $el.find('a[onclick*="fn_view"]').first().attr('onclick') || '';
      const idMatch = onclickAttr.match(/fn_view\s*\(\s*['"]?(\d+)/);
      const original_url = idMatch
        ? `${BASE_URL}/front/schedule/view.do?sIdx=${idMatch[1]}`
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

function resolveImg($el, baseUrl) {
  const src = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src.startsWith('/') ? src : '/' + src}`;
}

function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };
  // Format from site: "2026-04-11 ~ 2026-04-12"
  const m = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (m) return { start_date: normalizeDate(m[1]), end_date: normalizeDate(m[2]) };
  return { start_date: null, end_date: null };
}

module.exports = { crawl };
