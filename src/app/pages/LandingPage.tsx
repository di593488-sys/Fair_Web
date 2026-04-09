import { useState, useMemo } from 'react';
import { Navigation } from '../components/Navigation';
import { HeroSection } from '../components/HeroSection';
import { FeaturedCard } from '../components/FeaturedCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { ExhibitionCard } from '../components/ExhibitionCard';
import { Footer } from '../components/Footer';
import { useExhibitions } from '../context/ExhibitionsContext';

export function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const { exhibitions } = useExhibitions();

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
              <p className="text-gray-400">이 카테고리에 전시회가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </div>
  );
}