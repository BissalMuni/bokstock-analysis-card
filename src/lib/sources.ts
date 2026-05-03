import type Anthropic from '@anthropic-ai/sdk';
import type { SourceCitation } from './types/stock';

/**
 * Claude 응답에서 텍스트 + 웹검색 출처를 함께 추출
 * web_search 사용 시 마지막 text 블록이 최종 답변
 */
export function extractTextAndSources(message: Anthropic.Message): {
  text: string;
  sources: SourceCitation[];
} {
  const textBlocks = message.content.filter((b) => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('Claude 응답에서 텍스트를 찾을 수 없습니다');
  }

  const last = textBlocks[textBlocks.length - 1];
  if (last.type !== 'text') throw new Error('unexpected');

  // web_search_tool_result 블록에서 URL/제목/날짜 추출
  const sources: SourceCitation[] = [];
  const seenUrls = new Set<string>();

  for (const block of message.content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const item of block.content) {
        if (
          'type' in item &&
          item.type === 'web_search_result' &&
          'url' in item &&
          typeof item.url === 'string' &&
          !seenUrls.has(item.url)
        ) {
          seenUrls.add(item.url);
          sources.push({
            url: item.url,
            title: 'title' in item && typeof item.title === 'string' ? item.title : item.url,
            sourceType: 'news',
            date: 'page_age' in item && typeof item.page_age === 'string' ? item.page_age : null,
          });
        }
      }
    }
  }

  return { text: last.text, sources };
}

/** JSON 문자열 파싱 (코드블록, cite 태그, 앞뒤 텍스트 제거) */
export function parseJSON(text: string): unknown {
  let jsonStr = text.trim();
  // 코드블록 제거
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // <cite> 태그 및 내부 인덱스 제거
  jsonStr = jsonStr.replace(/<cite[^>]*>|<\/cite>/g, '');
  // JSON 배열/객체 시작 전 텍스트 제거
  const jsonStart = jsonStr.search(/[\[{]/);
  if (jsonStart > 0) {
    jsonStr = jsonStr.slice(jsonStart);
  }
  // JSON 배열/객체 끝 이후 텍스트 제거
  const lastBracket = Math.max(jsonStr.lastIndexOf(']'), jsonStr.lastIndexOf('}'));
  if (lastBracket > 0) {
    jsonStr = jsonStr.slice(0, lastBracket + 1);
  }

  // 1차 시도: 그대로 파싱
  try {
    return JSON.parse(jsonStr);
  } catch {
    // 2차 시도: JSON 문자열 내 제어문자/줄바꿈 이스케이프 수정
    const repaired = jsonStr
      .replace(/\n/g, '\\n')       // 문자열 내 실제 줄바꿈 → 이스케이프
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/,\s*([}\]])/g, '$1'); // trailing comma 제거
    try {
      return JSON.parse(repaired);
    } catch {
      // 3차 시도: 각 줄을 분석하여 유효한 JSON 배열만 추출
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const cleaned = arrayMatch[0]
          .replace(/\n/g, ' ')
          .replace(/,\s*]/g, ']');
        try {
          return JSON.parse(cleaned);
        } catch {
          // 최종 실패 시 디버그 로그
          console.error('JSON 파싱 최종 실패. 텍스트 앞 500자:', jsonStr.slice(0, 500));
          console.error('텍스트 에러 위치 근처:', jsonStr.slice(6100, 6200));
          throw new Error('JSON 파싱 실패: Claude 응답이 유효한 JSON이 아닙니다');
        }
      }
      // 배열도 없으면 객체 시도
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        const cleaned = objMatch[0].replace(/\n/g, ' ').replace(/,\s*}/g, '}');
        try { return JSON.parse(cleaned); } catch { /* fall through */ }
      }
      console.error('JSON 파싱 최종 실패. 전체 텍스트:', jsonStr.slice(0, 1000));
      throw new Error('JSON 파싱 실패: JSON 배열/객체를 찾을 수 없습니다');
    }
  }
}

/** DART 공시 데이터에서 출처 생성 */
export function buildDartSources(
  disclosures: Array<{ rcept_no: string; report_nm: string; rcept_dt: string }>,
): SourceCitation[] {
  return disclosures.map((d) => ({
    url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${d.rcept_no}`,
    title: d.report_nm,
    sourceType: 'dart' as const,
    date: d.rcept_dt,
  }));
}

/** 중복 제거된 소스 병합 */
export function mergeSources(...arrays: SourceCitation[][]): SourceCitation[] {
  const seen = new Set<string>();
  const result: SourceCitation[] = [];
  for (const arr of arrays) {
    for (const s of arr) {
      if (!seen.has(s.url)) {
        seen.add(s.url);
        result.push(s);
      }
    }
  }
  return result;
}
