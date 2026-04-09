import { Link } from 'react-router';
import { Search } from 'lucide-react';

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold tracking-tight text-white">
            전시회<span className="text-blue-500">레지스트리</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              예정전시
            </Link>
            <Link
              to="/"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              카테고리
            </Link>
            <Link
              to="/"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              아카이브
            </Link>
            <button className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
              <Search className="w-4 h-4" />
              <span>검색 / 색인</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}