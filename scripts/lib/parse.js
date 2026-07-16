'use strict';

const { normalizeDate } = require('../validate');

/**
 * Parses a "YYYY.MM.DD ~ YYYY.MM.DD" style range out of free text.
 * Falls back to treating a single date as both start and end (single-day event).
 */
function parseDateRange(text) {
  if (!text) return { start_date: null, end_date: null };

  const range = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-–—]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (range) return { start_date: normalizeDate(range[1]), end_date: normalizeDate(range[2]) };

  const single = text.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (single) {
    const d = normalizeDate(single[1]);
    return { start_date: d, end_date: d };
  }

  return { start_date: null, end_date: null };
}

/** Resolves an <img> src/data-src found under $el to an absolute URL. */
function resolveImg($el, baseUrl) {
  const src = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src.startsWith('/') ? src : '/' + src}`;
}

module.exports = { parseDateRange, resolveImg };
