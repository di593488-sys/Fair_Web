import { useState, useMemo } from 'react';
import { Navigation } from '../components/Navigation';
import { HeroSection } from '../components/HeroSection';
import { FeaturedCard } from '../components/FeaturedCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ExhibitionCard } from '../components/ExhibitionCard';
import { Footer } from '../components/Footer';
import { useExhibitions } from '../context/ExhibitionsContext';

const UPDATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const { exhibitions, error, usingMockData, lastSuccessAt, isStale } = useExhibitions();

  const featuredExhibitions = exhibitions.filter(ex => ex.isFeatured);
  
  const filteredExhibitions = useMemo(() => {
    return exhibitions.filter(ex => {
      if (selectedCategory === '전체') return true;
      return ex.category === selectedCategory;
    });
  }, [selectedCategory, exhibitions]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <HeroSection />
      
      {/* Featured Section */}
      <section className="pb-16 px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredExhibitions.map((exhibition, index) => (
              <FeaturedCard key={exhibition.id} exhibition={exhibition} index={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Category Filter */}
      <CategoryFilter 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      
      {/* Exhibition Grid */}
      <section className="pb-24 px-6 lg:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredExhibitions.map((exhibition) => (
              <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
            ))}
          </div>
          
          {filteredExhibitions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400">
                {!usingMockData && error
                  ? '박람회 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
                  : '이 카테고리에 전시회가 없습니다.'}
              </p>
            </div>
          )}

          {/* Data freshness status — small, unobtrusive footer note */}
          <div className="mt-12 text-center text-xs text-gray-500">
            {usingMockData ? (
              <p>예시 데이터가 표시되고 있습니다 (개발 환경).</p>
            ) : lastSuccessAt ? (
              <p>
                최종 업데이트: {UPDATE_FORMATTER.format(lastSuccessAt)}
                {isStale && (
                  <span className="block mt-1 text-amber-500">
                    박람회 정보 갱신이 지연되고 있습니다. 행사 공식 페이지에서 최신 일정을 확인해주세요.
                  </span>
                )}
              </p>
            ) : error ? (
              <p className="text-amber-500">박람회 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
            ) : null}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}