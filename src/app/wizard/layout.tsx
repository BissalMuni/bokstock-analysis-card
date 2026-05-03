import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주식 분석 카드뉴스 위자드',
  description: '종목명을 입력하면 단계별 인터랙션을 거쳐 카드뉴스 형태의 분석 콘텐츠를 생성합니다.',
};

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-center text-sm font-semibold text-zinc-700">
          주식 분석 카드뉴스
        </h1>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
