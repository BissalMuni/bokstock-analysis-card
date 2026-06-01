'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface StockEntry {
  slug: string;
  stockName: string;
  stockCode: string;
  date: string;
  href?: string; // 지정 시 이 경로로 이동 (세션은 /sessions/[id])
}

interface SidebarProps {
  entries: StockEntry[];
  isOpen: boolean;
  onClose: () => void;
}

/** 즐겨찾기 로컬스토리지 키 */
const FAVORITES_KEY = 'bokstock-favorites';

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function setFavorites(favs: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function Sidebar({ entries, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [favorites, setFavoritesState] = useState<string[]>([]);
  const [sessionEntries, setSessionEntries] = useState<StockEntry[]>([]);

  useEffect(() => {
    setFavoritesState(getFavorites());
  }, []);

  // Supabase에 저장된 완료 세션(웹 /auto 분석)을 최근 분석에 합친다.
  // 분석 완료 직후 'bokstock:session-saved' 이벤트로 즉시 갱신.
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions/recent');
        if (!res.ok) return;
        const { sessions } = await res.json();
        if (cancelled) return;
        setSessionEntries(
          (sessions as Array<{ id: string; stockName: string; date: string }>).map((s) => ({
            slug: s.id,
            stockName: s.stockName,
            stockCode: '',
            date: s.date,
            href: `/sessions/${s.id}`,
          })),
        );
      } catch { /* 무시 */ }
    }
    loadSessions();
    window.addEventListener('bokstock:session-saved', loadSessions);
    return () => {
      cancelled = true;
      window.removeEventListener('bokstock:session-saved', loadSessions);
    };
  }, []);

  const toggleFavorite = (slug: string) => {
    const next = favorites.includes(slug)
      ? favorites.filter((f) => f !== slug)
      : [...favorites, slug];
    setFavoritesState(next);
    setFavorites(next);
  };

  // Supabase 세션 + MDX 항목 병합 (날짜 내림차순)
  const allEntries = [...sessionEntries, ...entries].sort((a, b) => b.date.localeCompare(a.date));
  const favoriteEntries = allEntries.filter((e) => favorites.includes(e.slug));
  const recentEntries = allEntries.slice(0, 10);

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 로고 */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
          <Link href="/" className="text-sm font-bold text-zinc-900 no-underline">
            bokstock
          </Link>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 lg:hidden">
            ✕
          </button>
        </div>

        {/* 상단 메뉴 */}
        <div className="border-b border-zinc-200 px-3 py-3">
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/auto"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
                  pathname === '/auto'
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                onClick={onClose}
              >
                <span className="text-xs">⚡</span> 자동 분석
              </Link>
            </li>
            <li>
              <Link
                href="/wizard"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
                  pathname === '/wizard'
                    ? 'bg-zinc-200 text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                onClick={onClose}
              >
                <span className="text-xs">🧩</span> 위자드 분석
              </Link>
            </li>
          </ul>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* 즐겨찾기 */}
          {favoriteEntries.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                즐겨찾기
              </p>
              <ul className="space-y-0.5">
                {favoriteEntries.map((e) => (
                  <SidebarItem
                    key={`fav-${e.slug}`}
                    entry={e}
                    currentPath={pathname}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(e.slug)}
                    onClick={onClose}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* 최근 분석 */}
          <div className="mb-6">
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              최근 분석
            </p>
            {recentEntries.length === 0 ? (
              <p className="px-2 text-xs text-zinc-400">분석 결과가 없습니다</p>
            ) : (
              <ul className="space-y-0.5">
                {recentEntries.map((e) => (
                  <SidebarItem
                    key={e.href ?? e.slug}
                    entry={e}
                    currentPath={pathname}
                    isFavorite={favorites.includes(e.slug)}
                    onToggleFavorite={() => toggleFavorite(e.slug)}
                    onClick={onClose}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/** 사이드바 항목 */
function SidebarItem({
  entry,
  currentPath,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  entry: StockEntry;
  currentPath: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const href = entry.href ?? `/stocks/${entry.slug}`;
  const isActive = currentPath === href;
  return (
    <li className="group relative">
      <Link
        href={href}
        className={`flex items-center rounded-lg px-3 py-2 text-sm no-underline transition-colors ${
          isActive
            ? 'bg-zinc-200 text-zinc-900 font-medium'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
        }`}
        onClick={onClick}
      >
        <span className="truncate">{entry.stockName}</span>
        <span className="ml-auto text-[10px] text-zinc-400">{entry.date.slice(5)}</span>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite();
        }}
        className={`absolute right-8 top-1/2 -translate-y-1/2 text-xs transition-opacity ${
          isFavorite ? 'text-amber-400 opacity-100' : 'text-zinc-300 opacity-0 group-hover:opacity-100'
        }`}
        title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </li>
  );
}
