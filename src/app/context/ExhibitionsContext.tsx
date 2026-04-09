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
  error: string | null;
}

const ExhibitionsContext = createContext<ExhibitionsContextValue>({
  exhibitions: mockData,
  loading:     false,
  error:       null,
});

export function ExhibitionsProvider({ children }: { children: ReactNode }) {
  const [exhibitions, setExhibitions] = useState<Exhibition[]>(mockData);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/exhibitions.json`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RawExhibition[]>;
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setExhibitions(data.map(mapToExhibition));
        }
        // If the JSON is empty, keep showing mock data
      })
      .catch(err => {
        // Fetch failed (404 on local dev, network error, etc.) → keep mock data
        console.warn('[ExhibitionsContext] Could not load exhibitions.json, using mock data:', err.message);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ExhibitionsContext.Provider value={{ exhibitions, loading, error }}>
      {children}
    </ExhibitionsContext.Provider>
  );
}

export function useExhibitions(): ExhibitionsContextValue {
  return useContext(ExhibitionsContext);
}
