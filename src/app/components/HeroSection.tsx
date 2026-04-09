import { Search } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="pt-32 pb-16 px-6 lg:px-12">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight max-w-4xl">
          전시회를 찾아보세요...
        </h1>
        
        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="전시회, 장소, 카테고리를 검색하세요..."
            className="w-full h-16 pl-16 pr-6 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>
    </section>
  );
}