import type { SentimentTag, SourceCitation } from '../types/stock';

/** MDX에서 파싱된 분석 섹션 */
export interface ParsedAnalysis {
  title: string;
  sentiment: SentimentTag;
  sourceType: 'news' | 'dart';
  summary: string;
  keyPoints: string[];
  confidence: number;
  sources: SourceCitation[];
}

/** MDX에서 파싱된 용어 */
export interface ParsedTerm {
  word: string;
  definition: string;
  analogy: string;
}

/** MDX 파싱 결과 전체 */
export interface ParsedMdx {
  analyses: ParsedAnalysis[];
  terms: ParsedTerm[];
}

/** 감성 텍스트 → SentimentTag */
function parseSentiment(text: string): SentimentTag {
  if (text.includes('긍정')) return 'positive';
  if (text.includes('부정')) return 'negative';
  return 'neutral';
}

/** ●○ 문자열 → 신뢰도 숫자 */
function parseConfidence(text: string): number {
  return (text.match(/●/g) || []).length;
}

/** 출처 라인 파싱: - 📰 [제목](URL) (날짜) */
function parseSourceLine(line: string): SourceCitation | null {
  const match = line.match(/^-\s*(📰|📋)\s*\[(.+?)\]\((.+?)\)\s*(?:\((.+?)\))?/);
  if (!match) return null;
  return {
    sourceType: match[1] === '📋' ? 'dart' : 'news',
    title: match[2],
    url: match[3],
    date: match[4] ?? null,
  };
}

/** MDX 본문을 구조화된 데이터로 파싱 */
export function parseMdxContent(content: string): ParsedMdx {
  const lines = content.split('\n');
  const analyses: ParsedAnalysis[] = [];
  const terms: ParsedTerm[] = [];

  let i = 0;

  // 분석 요약 테이블에서 신뢰도 추출
  const confidenceMap = new Map<string, number>();
  while (i < lines.length) {
    const line = lines[i];
    // 요약 테이블 행: | 📰 제목 | 📈 긍정 | ●●●●○ |
    const tableMatch = line.match(/^\|\s*(📰|📋)\s*(.+?)\s*\|\s*.+?\s*\|\s*([●○]+)\s*\|$/);
    if (tableMatch) {
      confidenceMap.set(tableMatch[2].trim(), parseConfidence(tableMatch[3]));
    }
    i++;
    // 요약 테이블 끝나면 분석 섹션 파싱으로
    if (line.startsWith('## ') && !line.includes('분석 요약')) {
      i--; // 되감기
      break;
    }
  }

  // 분석 섹션 + 용어 해설 파싱
  while (i < lines.length) {
    const line = lines[i];

    // 용어 해설 테이블
    if (line.startsWith('## 용어 해설')) {
      i++; // 빈 줄 건너뛰기
      while (i < lines.length && !lines[i].startsWith('|')) i++;
      i += 2; // 헤더 + 구분선 건너뛰기
      while (i < lines.length && lines[i].startsWith('|')) {
        const cols = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 3) {
          terms.push({
            word: cols[0].replace(/\*\*/g, ''),
            definition: cols[1],
            analogy: cols[2],
          });
        }
        i++;
      }
      continue;
    }

    // 분석 섹션 시작: ## 제목
    if (line.startsWith('## ') && !line.includes('분석 요약')) {
      const title = line.replace('## ', '').trim();
      i++;

      // 빈 줄 건너뛰기
      while (i < lines.length && lines[i].trim() === '') i++;

      // 감성/소스 라인: > 📈 긍정 | 📰 뉴스/이슈 기반
      let sentiment: SentimentTag = 'neutral';
      let sourceType: 'news' | 'dart' = 'news';
      if (i < lines.length && lines[i].startsWith('>')) {
        const metaLine = lines[i];
        sentiment = parseSentiment(metaLine);
        sourceType = metaLine.includes('DART') ? 'dart' : 'news';
        i++;
      }

      // 빈 줄 건너뛰기
      while (i < lines.length && lines[i].trim() === '') i++;

      // 본문 수집 (핵심 포인트 전까지)
      const summaryLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('**핵심') && !lines[i].startsWith('## ') && !lines[i].startsWith('---')) {
        if (lines[i].trim()) summaryLines.push(lines[i].trim());
        i++;
      }

      // 핵심 포인트
      const keyPoints: string[] = [];
      if (i < lines.length && lines[i].startsWith('**핵심')) {
        i++;
        while (i < lines.length && lines[i].startsWith('- ')) {
          keyPoints.push(lines[i].replace(/^- /, '').trim());
          i++;
        }
      }

      // 빈 줄 건너뛰기
      while (i < lines.length && lines[i].trim() === '') i++;

      // 출처
      const sources: SourceCitation[] = [];
      if (i < lines.length && lines[i].startsWith('**출처')) {
        i++;
        while (i < lines.length && lines[i].startsWith('- ')) {
          const src = parseSourceLine(lines[i]);
          if (src) sources.push(src);
          i++;
        }
      }

      const confidence = confidenceMap.get(title) ?? 3;

      analyses.push({
        title,
        sentiment,
        sourceType,
        summary: summaryLines.join(' '),
        keyPoints,
        confidence,
        sources,
      });
      continue;
    }

    i++;
  }

  return { analyses, terms };
}
