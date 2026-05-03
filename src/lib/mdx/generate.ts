import type { AnalysisAngle, AnalysisResult, Term, SourceCitation } from '../types/stock';

interface GenerateParams {
  stockName: string;
  stockCode: string;
  date: string; // YYYYMMDD
  sessionId?: string;
  angles: AnalysisAngle[];
  selectedAngles: AnalysisAngle[];
  analysis: (AnalysisResult & { confidence?: number; sources?: SourceCitation[] })[];
  terms: Term[];
}

/** 감성 태그 이모지 */
function sentimentEmoji(s: string): string {
  if (s === 'positive') return '📈 긍정';
  if (s === 'negative') return '📉 부정';
  return '➖ 중립';
}

/** 날짜 포맷: YYYYMMDD → YYYY-MM-DD */
function formatDate(d: string): string {
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
}

/** 출처 마크다운 생성 */
function renderSources(sources?: SourceCitation[]): string {
  if (!sources || sources.length === 0) return '';

  const lines = sources.map((s) => {
    const icon = s.sourceType === 'dart' ? '📋' : '📰';
    const dateStr = s.date ? ` (${s.date})` : '';
    return `- ${icon} [${s.title}](${s.url})${dateStr}`;
  });

  return `\n**출처:**\n${lines.join('\n')}\n`;
}

/**
 * 분석 결과를 MDX 문자열로 생성
 */
export function generateAnalysisMdx(params: GenerateParams): string {
  const { stockName, stockCode, date, sessionId, selectedAngles, analysis, terms } = params;
  const formattedDate = formatDate(date);

  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`title: "${stockName} 종합 분석"`);
  lines.push(`stockCode: "${stockCode}"`);
  lines.push(`stockName: "${stockName}"`);
  lines.push(`date: "${formattedDate}"`);
  if (sessionId) lines.push(`sessionId: "${sessionId}"`);
  lines.push(`angles: ${selectedAngles.length}`);
  lines.push('---');
  lines.push('');

  // 제목
  lines.push(`# ${stockName} 종합 분석`);
  lines.push('');
  lines.push(`> 분석일: ${formattedDate} | 종목코드: ${stockCode}`);
  lines.push('');

  // 분석 요약 테이블
  lines.push('## 분석 요약');
  lines.push('');
  lines.push('| 꼭지 | 감성 | 신뢰도 |');
  lines.push('|------|------|--------|');
  for (const a of analysis) {
    const angle = selectedAngles.find((sa) => sa.id === a.angleId);
    const source = angle?.source === 'dart' ? '📋' : '📰';
    const conf = 'confidence' in a && a.confidence ? `${'●'.repeat(a.confidence)}${'○'.repeat(5 - a.confidence)}` : '-';
    lines.push(`| ${source} ${a.title} | ${sentimentEmoji(a.sentiment)} | ${conf} |`);
  }
  lines.push('');

  // 각 분석 상세
  for (const a of analysis) {
    const angle = selectedAngles.find((sa) => sa.id === a.angleId);
    const sourceTag = angle?.source === 'dart' ? '📋 DART 공시 기반' : '📰 뉴스/이슈 기반';

    lines.push(`## ${a.title}`);
    lines.push('');
    lines.push(`> ${sentimentEmoji(a.sentiment)} | ${sourceTag}`);
    lines.push('');
    lines.push(a.summary);
    lines.push('');
    lines.push('**핵심 포인트:**');
    for (const kp of a.keyPoints) {
      lines.push(`- ${kp}`);
    }
    lines.push(renderSources(a.sources));
    lines.push('---');
    lines.push('');
  }

  // 용어 해설
  if (terms.length > 0) {
    lines.push('## 용어 해설');
    lines.push('');
    lines.push('| 용어 | 설명 | 비유 |');
    lines.push('|------|------|------|');
    for (const t of terms) {
      lines.push(`| **${t.word}** | ${t.definition} | ${t.analogy} |`);
    }
    lines.push('');
  }

  // 푸터
  lines.push('---');
  lines.push('');
  lines.push(`*이 분석은 AI 기반 자동 분석 결과입니다. 투자 판단의 참고용으로만 활용하세요.*`);

  return lines.join('\n');
}
