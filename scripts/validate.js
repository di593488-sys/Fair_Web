'use strict';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a single exhibition item against all required schema rules.
 * Returns true if valid, false otherwise.
 */
function isValidExhibition(item) {
  if (!item || typeof item !== 'object') return false;
  // Required non-empty strings
  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') return false;
  if (!item.original_url || typeof item.original_url !== 'string' || item.original_url.trim() === '') return false;
  if (!item.source || typeof item.source !== 'string' || item.source.trim() === '') return false;
  // Dates must match YYYY-MM-DD
  if (!item.start_date || !DATE_REGEX.test(item.start_date)) return false;
  if (!item.end_date || !DATE_REGEX.test(item.end_date)) return false;
  // start_date must not be later than end_date
  if (item.start_date > item.end_date) return false;
  // created_at must match YYYY-MM-DD
  if (!item.created_at || !DATE_REGEX.test(item.created_at)) return false;
  // Optional string fields must be strings even if empty
  if (typeof item.image_url !== 'string') return false;
  if (typeof item.description !== 'string') return false;
  if (typeof item.venue !== 'string') return false;
  if (typeof item.location !== 'string') return false;
  // fee must be string or null
  if (item.fee !== null && typeof item.fee !== 'string') return false;
  return true;
}

/**
 * Validates and filters an array of exhibition items.
 * Logs a warning for each removed item.
 */
function validateExhibitions(items) {
  const valid = [];
  const invalid = [];

  for (const item of items) {
    if (isValidExhibition(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  }

  if (invalid.length > 0) {
    console.warn(`[validate] Removed ${invalid.length} invalid items:`);
    for (const item of invalid) {
      const reason = diagnose(item);
      console.warn(`  - "${item?.title ?? '(no title)'}" → ${reason}`);
    }
  }

  return valid;
}

function diagnose(item) {
  if (!item || typeof item !== 'object') return 'not an object';
  if (!item.id || item.id.trim() === '') return 'missing id';
  if (!item.title || item.title.trim() === '') return 'missing title';
  if (!item.original_url || item.original_url.trim() === '') return 'missing original_url';
  if (!item.source || item.source.trim() === '') return 'missing source';
  if (!item.start_date || !DATE_REGEX.test(item.start_date)) return `invalid start_date: "${item.start_date}"`;
  if (!item.end_date || !DATE_REGEX.test(item.end_date)) return `invalid end_date: "${item.end_date}"`;
  if (item.start_date > item.end_date) return `start_date (${item.start_date}) is after end_date (${item.end_date})`;
  if (!item.created_at || !DATE_REGEX.test(item.created_at)) return `invalid created_at: "${item.created_at}"`;
  if (typeof item.image_url !== 'string') return 'image_url must be a string';
  if (typeof item.description !== 'string') return 'description must be a string';
  if (typeof item.venue !== 'string') return 'venue must be a string';
  if (typeof item.location !== 'string') return 'location must be a string';
  if (item.fee !== null && typeof item.fee !== 'string') return 'fee must be string or null';
  return 'unknown';
}

/**
 * Deduplicates items by original_url (primary) and title+start_date (secondary).
 */
function deduplicateExhibitions(items) {
  const seenUrls = new Set();
  const seenKeys = new Set();
  const result = [];

  for (const item of items) {
    const urlKey = item.original_url?.trim().toLowerCase();
    const titleKey = `${item.title?.trim().toLowerCase()}::${item.start_date}`;

    if (urlKey && seenUrls.has(urlKey)) {
      console.warn(`[deduplicate] Skipping duplicate url: "${item.title}"`);
      continue;
    }
    if (seenKeys.has(titleKey)) {
      console.warn(`[deduplicate] Skipping duplicate title+date: "${item.title}" (${item.start_date})`);
      continue;
    }

    if (urlKey) seenUrls.add(urlKey);
    seenKeys.add(titleKey);
    result.push(item);
  }

  return result;
}

/**
 * Normalize a date string to YYYY-MM-DD.
 * Handles formats: YYYY.MM.DD, YYYY/MM/DD, YYYYMMDD, YY.MM.DD
 */
function normalizeDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();

  // Already correct
  if (DATE_REGEX.test(str)) return str;

  // YYYY.MM.DD or YYYY/MM/DD
  const dotSlash = str.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (dotSlash) {
    const [, y, m, d] = dotSlash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYYMMDD
  const compact = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const [, y, m, d] = compact;
    return `${y}-${m}-${d}`;
  }

  // YY.MM.DD → assume 20YY
  const short = str.match(/^(\d{2})[./](\d{1,2})[./](\d{1,2})$/);
  if (short) {
    const [, y, m, d] = short;
    return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

module.exports = { validateExhibitions, deduplicateExhibitions, normalizeDate };
