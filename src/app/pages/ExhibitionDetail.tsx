import { useParams, Link, useNavigate } from 'react-router';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { useExhibitions } from '../context/ExhibitionsContext';
import { ArrowLeft, MapPin, Calendar, ExternalLink, Bookmark } from 'lucide-react';

export function ExhibitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { exhibitions } = useExhibitions();
  const exhibition = exhibitions.find(ex => ex.id === id);

  if (!exhibition) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">전시회를 찾을 수 없습니다</h1>
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`;
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
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      
      <div className="pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로가기</span>
          </button>
          
          {/* Header Image */}
          <div className="relative aspect-[21/9] rounded-3xl overflow-hidden mb-12">
            <img
              src={exhibition.image}
              alt={exhibition.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            
            {/* Source Badge */}
            <div className="absolute top-8 right-8">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getSourceColor(exhibition.source)}`}>
                {exhibition.source}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Category */}
              <div className="mb-4">
                <span className="inline-block px-4 py-1.5 bg-white/5 rounded-full text-xs font-medium text-gray-400 uppercase tracking-wider border border-white/10">
                  {exhibition.category}
                </span>
              </div>
              
              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                {exhibition.title}
              </h1>
              
              {/* Description */}
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                {exhibition.description}
              </p>
              
              {/* Full Description */}
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                  {exhibition.fullDescription}
                </p>
              </div>
              
              {/* CTA Button */}
              <div className="mt-12">
                <a
                  href={exhibition.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  원본 사이트로 이동
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-32 space-y-6">
                {/* Key Information Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-white mb-6 uppercase tracking-wider">
                    주요 정보
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Date */}
                    <div>
                      <div className="flex items-start gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                            행사 기간
                          </div>
                          <div className="text-sm text-white font-medium">
                            {formatDate(exhibition.startDate, exhibition.endDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div>
                      <div className="flex items-start gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                            장소
                          </div>
                          <div className="text-sm text-white font-medium mb-1">
                            {exhibition.venue}
                          </div>
                          <div className="text-sm text-gray-400">
                            {exhibition.location}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Admission */}
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        입장료
                      </div>
                      <div className="text-sm text-white font-medium">
                        {exhibition.admission}
                      </div>
                    </div>
                    
                    {/* Source */}
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        출처
                      </div>
                      <div className="text-sm text-white font-medium">
                        {exhibition.source}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bookmark Button */}
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-all">
                  <Bookmark className="w-4 h-4" />
                  컬렉션에 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}