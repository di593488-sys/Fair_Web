'use strict';

const axios = require('axios');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET a URL with a timeout and limited retries.
 * - 429 responses wait for Retry-After (or a backoff) before the next attempt.
 * - Other errors (timeout, 5xx, network) retry with a short fixed backoff.
 * - Exhausting retries throws the last error — callers should catch per-crawler.
 */
async function getWithRetry(url, { headers = {}, timeout = 15000, retries = 2, backoffMs = 1500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, {
        headers: { ...DEFAULT_HEADERS, ...headers },
        timeout,
        // Default validateStatus (2xx only) — non-2xx throws and is handled below.
      });
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;

      if (status === 429) {
        const retryAfter = Number(err.response.headers['retry-after']) * 1000 || backoffMs * (attempt + 1);
        if (attempt < retries) await sleep(retryAfter);
        continue;
      }
      if (attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
    }
  }
  throw lastErr;
}

module.exports = { getWithRetry, sleep, DEFAULT_HEADERS };
