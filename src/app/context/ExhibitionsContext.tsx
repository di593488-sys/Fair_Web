import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Exhibition, exhibitions as mockData } from '../data/exhibitions';

// ── Raw JSON schema (snake_case from crawlers) ────────────────────────────────
interface RawExhibition {
  id: string;
  title: string;
  image_url: string;
  description: string;
  venue: string;
  location: string;
  start_date: string;
  end_date: string;
  fee: string | null;
  source: string;
  original_url: string;
  created_at: string;
}

interface CrawlMeta {
  last_attempt_at: string | null;
  last_success_at: string | null;
  total_count: number;
  successful_sources: string[];
  failed_sources: string[];
}

const STALE_AFTER_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Source → category mapping (best-effort) ────────────────────────────────
const SOURCE_CATEGORY_MAP: Record<string, Exhibition['source']> = {
  'KINTEX':      'KINTEX',
  'COEX':        'COEX',
  'SETEC':       'SETEC',
  'BEXCO':       'BEXCO',
  'Suwon Messe': 'Suwon Messe',
  'COEX Magok':  'COEX Magok',
};

function inferCategory(raw: RawExhibition): string {
  const text = `${raw.title} ${raw.description}`.toLowerCase();
  if (/테크|기술|전자|it|ai|ict|소프트웨어|게이밍|게임/.test(text)) return '테크';
  if (/아트|미술|디자인|art|design|공예/.test(text)) return '아트 / 디자인';
  if (/산업|제조|자동화|기계|건축|화학|금속/.test(text)) return '산업박람회';
  if (/스타트업|창업|투자|벤처/.test(text)) return '스타트업';
  if (/교육|에듀|학습|학교|edtech/.test(text)) return '교육';
  if (/패션|뷰티|푸드|식품|라이프|자동차|여행|문화/.test(text)) return '라이프스타일';
  return '기타';
}

// ── Field adapter: RawExhibition → Exhibition ─────────────────────────────────
function mapToExhibition(raw: RawExhibition): Exhibition {
  return {
    id:              raw.id,
    title:           raw.title,
    description:     raw.description || '',
    fullDescription: raw.description || '',
    image:           raw.image_url || '',
    category:        inferCategory(raw),
    venue:           raw.venue || '',
    location:        raw.location || '',
    startDate:       raw.start_date,
    endDate:         raw.end_date,
    admission:       raw.fee ?? '정보 없음',
    source:          SOURCE_CATEGORY_MAP[raw.source] ?? ('COEX' as Exhibition['source']),
    sourceUrl:       raw.original_url,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────
interface ExhibitionsContextValue {
  exhibitions: Exhibition[];
  loading: boolean;
  /** Set when exhibitions.json could not be loaded at all (missing / network error). */
  error: string | null;
  /** True only in dev, when mock data is standing in for a missing local JSON. */
  usingMockData: boolean;
  lastSuccessAt: Date | null;
  isStale: boolean;
  failedSources: string[];
}

const ExhibitionsContext = createContext<ExhibitionsContextValue>({
  exhibitions:   mockData,
  loading:       false,
  error:         null,
  usingMockData: true,
  lastSuccessAt: null,
  isStale:       false,
  failedSources: [],
});

export function ExhibitionsProvider({ children }: { children: ReactNode }) {
  const isDev = import.meta.env.DEV;

  const [exhibitions, setExhibitions]     = useState<Exhibition[]>(isDev ? mockData : []);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(isDev);
  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [failedSources, setFailedSources] = useState<string[]>([]);

  useEffect(() => {
    // cache: 'no-store' — a stale cached exhibitions.json served forever from
    // the browser cache is exactly the kind of "invisible failure" this
    // project ran into at the CDN layer; don't repeat it client-side.
    fetch(`${import.meta.env.BASE_URL}data/exhibitions.json`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RawExhibition[]>;
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('exhibitions.json is not an array');
        setExhibitions(data.map(mapToExhibition));
        setUsingMockData(false);
        // A valid, possibly-empty response is not an error — an empty
        // result is a real (if unlikely) state, not something to paper
        // over with mock data in production.
      })
      .catch(err => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[ExhibitionsContext] Could not load exhibitions.json:', message);
        setError(message);
        if (isDev) {
          // Local dev convenience only — never in production, where mock
          // cards would be indistinguishable from real, current listings.
          setExhibitions(mockData);
          setUsingMockData(true);
        } else {
          setExhibitions([]);
          setUsingMockData(false);
        }
      })
      .finally(() => setLoading(false));

    fetch(`${import.meta.env.BASE_URL}data/crawl-meta.json`, { cache: 'no-store' })
      .then(res => (res.ok ? (res.json() as Promise<CrawlMeta>) : null))
      .then(meta => {
        if (!meta) return;
        if (meta.last_success_at) setLastSuccessAt(new Date(meta.last_success_at));
        setFailedSources(meta.failed_sources ?? []);
      })
      .catch(err => {
        // Non-fatal — the listing itself still works without freshness metadata.
        console.warn('[ExhibitionsContext] Could not load crawl-meta.json:', err);
      });
  }, []);

  const isStale = lastSuccessAt !== null && Date.now() - lastSuccessAt.getTime() > STALE_AFTER_MS;

  return (
    <ExhibitionsContext.Provider
      value={{ exhibitions, loading, error, usingMockData, lastSuccessAt, isStale, failedSources }}
    >
      {children}
    </ExhibitionsContext.Provider>
  );
}

export function useExhibitions(): ExhibitionsContextValue {
  return useContext(ExhibitionsContext);
}
