export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl mt-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="text-xl font-bold tracking-tight text-white mb-4">
              전시회<span className="text-blue-500">레지스트리</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-md">
              수원메쎄, 킨텍스, 셋텍, 코엑스, 코엑스 마곡, 벡스코 등 
              한국 주요 전시장의 문화 및 산업 행사 정보를 집약한 
              권위있는 디렉토리입니다.
            </p>
          </div>
          
          {/* Information */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              정보
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  색인 소개
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  수집 방법론
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  제출 포털
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  개인정보 정책
                </a>
              </li>
            </ul>
          </div>
          
          {/* Socials */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              소셜
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  인스타그램
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  X / 트위터
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  링크드인
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                  뉴스레터
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-xs text-gray-500">
            © 2026 전시회레지스트리. 이 플랫폼은 여러 전시장 웹사이트의 전시 및 박람회 정보를 집약합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}