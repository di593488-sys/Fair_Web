import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">페이지를 찾을 수 없습니다</p>
        <Link
          to="/"
          className="inline-block px-8 py-4 bg-white text-black rounded-xl font-semibold hover:bg-gray-100 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}