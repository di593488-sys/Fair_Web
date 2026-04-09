import { Link } from 'react-router';
import { Exhibition } from '../data/exhibitions';
import { ArrowUpRight } from 'lucide-react';

interface FeaturedCardProps {
  exhibition: Exhibition;
  index: number;
}

export function FeaturedCard({ exhibition, index }: FeaturedCardProps) {
  const isFirst = index === 0;

  return (
    <Link
      to={`/exhibition/${exhibition.id}`}
      className="group relative overflow-hidden rounded-3xl aspect-[16/10] md:aspect-[16/9]"
    >
      {/* Image */}
      <img
        src={exhibition.image}
        alt={exhibition.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
        {/* Badge */}
        <div className="mb-4">
          <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/20">
            {isFirst ? '주요 박람회' : '곧 개최'}
          </span>
        </div>
        
        {/* Title */}
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {exhibition.title}
        </h2>
        
        {/* Description */}
        <p className="text-lg text-gray-300 mb-6 max-w-2xl line-clamp-2">
          {exhibition.description}
        </p>
        
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{exhibition.venue}</span>
          <span>•</span>
          <span>{new Date(exhibition.startDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} - {new Date(exhibition.endDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</span>
        </div>
        
        {/* Hover Arrow */}
        <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </Link>
  );
}