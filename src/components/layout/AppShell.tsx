'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

interface StockEntry {
  slug: string;
  stockName: string;
  stockCode: string;
  date: string;
}

interface AppShellProps {
  entries: StockEntry[];
  children: React.ReactNode;
}

export function AppShell({ entries, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        entries={entries}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="flex h-14 items-center border-b border-zinc-200 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-600 hover:text-zinc-900"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          </button>
          <span className="ml-3 text-sm font-bold text-zinc-900">bokstock</span>
        </header>
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
