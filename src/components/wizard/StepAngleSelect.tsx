'use client';

import { useEffect, useRef } from 'react';
import { useWizardStore } from '@/lib/store/wizard-store';
import { executeStep } from '@/lib/prompts';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import type { AnalysisAngle, AnalysisResult } from '@/lib/types/stock';

/** 중요도 배지 색상 */
function importanceBadge(importance: number) {
  if (importance >= 8) return 'bg-red-100 text-red-700';
  if (importance >= 5) return 'bg-amber-100 text-amber-700';
  return 'bg-zinc-100 text-zinc-500';
}

/** 소스별 섹션 컴포넌트 */
function AngleSection({
  title,
  subtitle,
  angles,
  selectedAngles,
  totalSelected,
  onToggle,
}: {
  title: string;
  subtitle: string;
  angles: AnalysisAngle[];
  selectedAngles: AnalysisAngle[];
  totalSelected: number;
  onToggle: (angle: AnalysisAngle) => void;
}) {
  // 중요도 순으로 정렬
  const sorted = [...angles].sort((a, b) => b.importance - a.importance);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-zinc-700">{title}</h3>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map((angle) => {
          const isSelected = selectedAngles.some((a) => a.id === angle.id);
          return (
            <div key={angle.id} className="relative">
              <Chip
                label={angle.label}
                description={angle.description}
                selected={isSelected}
                disabled={!isSelected && totalSelected >= 5}
                onClick={() => onToggle(angle)}
              />
              {/* 중요도 배지 */}
              <span
                className={`absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${importanceBadge(angle.importance)}`}
              >
                {angle.importance}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StepAngleSelect() {
  const {
    stockName,
    sessionId,
    availableAngles,
    selectedAngles,
    setSelectedAngles,
    toggleAngle,
    setAnalysisResults,
    nextStep,
    setLoading,
    isLoading,
  } = useWizardStore();

  const autoSelected = useRef(false);

  // 최초 로드 시 중요도 상위 5개 자동 선택
  useEffect(() => {
    if (availableAngles.length > 0 && !autoSelected.current) {
      autoSelected.current = true;
      const top5 = [...availableAngles]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 5);
      setSelectedAngles(top5);
    }
  }, [availableAngles, setSelectedAngles]);

  const newsAngles = availableAngles.filter((a) => a.source === 'news');
  const dartAngles = availableAngles.filter((a) => a.source === 'dart');

  const handleNext = async () => {
    setLoading(true);
    try {
      const result = await executeStep<AnalysisResult[]>('step2-angle-analysis', {
        stockName,
        selectedAngles,
        sessionId,
      });
      setAnalysisResults(result.data);
      nextStep();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">주요 주제 꼭지 분석</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {stockName} — 중요도순 정렬, 상위 5개 자동 선택됨 ({selectedAngles.length}/5)
          </p>
        </div>
        {selectedAngles.length > 0 && (
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            onClick={() => setSelectedAngles([])}
          >
            선택 초기화
          </button>
        )}
      </div>

      {/* 뉴스 기반 섹션 */}
      {newsAngles.length > 0 && (
        <AngleSection
          title="📰 뉴스/이슈 기반"
          subtitle="최근 뉴스, 시장 트렌드, 업계 이슈 분석"
          angles={newsAngles}
          selectedAngles={selectedAngles}
          totalSelected={selectedAngles.length}
          onToggle={toggleAngle}
        />
      )}

      {/* DART 공시 기반 섹션 */}
      {dartAngles.length > 0 && (
        <AngleSection
          title="📋 DART 공시 기반 (2년치)"
          subtitle="전자공시 실적, 재무변동, 지배구조, 주요 이벤트"
          angles={dartAngles}
          selectedAngles={selectedAngles}
          totalSelected={selectedAngles.length}
          onToggle={toggleAngle}
        />
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={selectedAngles.length === 0 || isLoading}
        >
          {isLoading ? '분석 중...' : '다음 →'}
        </Button>
      </div>
    </div>
  );
}
