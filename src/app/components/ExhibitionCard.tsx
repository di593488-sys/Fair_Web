import { Link } from 'react-router';
import { Exhibition } from '../data/exhibitions';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';

interface ExhibitionCardProps {
  exhibition: Exhibition;
}

export function ExhibitionCard({ exhibition }: ExhibitionCardProps) {
  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('ko-KR', { month: 'long' });
    const endMonth = endDate.toLocaleDateString('ko-KR', { month: 'long' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}일 - ${endDay}일`;
    }
    return `${startMonth} ${startDay}일 - ${endMonth} ${endDay}일`;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'KINTEX': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'COEX': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'SETEC': 'bg-green-500/10 text-green-400 border-green-500/20',
      'BEXCO': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'Suwon Messe': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'COEX Magok': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    };
    return colors[source] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="group bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-white/5">
      {/* Image */}
      <Link to={`/exhibition/${exhibition.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={exhibition.image}
          alt={exhibition.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Source Badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getSourceColor(exhibition.source)}`}>
            {exhibition.source}
          </span>
        </div>
      </Link>
      
      {/* Content */}
      <div className="p-6">
        {/* Category */}
        <div className="mb-3">
          <span className="inline-block text-xs font-medium text-gray-400 uppercase tracking-wider">
            {exhibition.category}
          </span>
        </div>
        
        {/* Title */}
        <Link to={`/exhibition/${exhibition.id}`}>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
            {exhibition.title}
          </h3>
        </Link>
        
        {/* Venue */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-1">
          {exhibition.venue}
        </p>
        
        {/* Meta Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{exhibition.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(exhibition.startDate, exhibition.endDate)}</span>
          </div>
        </div>
        
        {/* Admission */}
        <div className="mb-4">
          <span className="text-sm font-medium text-white">
            {exhibition.admission}
          </span>
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {exhibition.description}
        </p>
        
        {/* CTA Button */}
        <Link
          to={`/exhibition/${exhibition.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all"
        >
          상세보기
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}