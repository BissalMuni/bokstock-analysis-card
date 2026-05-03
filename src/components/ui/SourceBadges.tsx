import type { SourceCitation } from '@/lib/types/stock';

interface SourceBadgesProps {
  sources?: SourceCitation[];
}

/** 출처 배지 + 링크 컴포넌트 */
export function SourceBadges({ sources }: SourceBadgesProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">출처</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <a
            key={`${s.url}-${i}`}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors no-underline ${
              s.sourceType === 'dart'
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            title={s.title}
          >
            <span>{s.sourceType === 'dart' ? '📋' : '📰'}</span>
            <span className="max-w-[160px] truncate">{s.title}</span>
            {s.date && (
              <span className="text-[10px] opacity-60">({s.date})</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
