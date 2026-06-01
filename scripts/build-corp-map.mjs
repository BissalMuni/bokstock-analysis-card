// DART 고유번호 전체 목록을 받아 "상장사만" 추려 정적 JSON으로 저장한다.
// 런타임 3.4MB 다운로드를 제거하기 위한 빌드용 스크립트.
// 사용법: node scripts/build-corp-map.mjs   (DART_KEY 필요)
// DART는 분기마다 기업이 바뀌므로 주기적으로 재실행해 corp-map.json을 갱신한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// .env.local 수동 로드
try {
  const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* CI 등에서는 환경변수가 직접 주입됨 */ }

const KEY = process.env.DART_KEY;
if (!KEY) {
  console.error('DART_KEY 환경변수가 필요합니다');
  process.exit(1);
}

const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${KEY}`;
console.log('corpCode.xml 다운로드 중...');
const res = await fetch(url);
if (!res.ok) {
  console.error(`다운로드 실패: ${res.status}`);
  process.exit(1);
}

const buf = await res.arrayBuffer();
const zip = await JSZip.loadAsync(buf);
const xmlFile = Object.values(zip.files).find((f) => f.name.endsWith('.xml'));
if (!xmlFile) {
  console.error('ZIP 내 XML 파일을 찾을 수 없습니다');
  process.exit(1);
}
const xmlText = await xmlFile.async('text');

// 정규식 파싱 (client.ts와 동일 로직)
const entries = [];
const listRegex = /<list>([\s\S]*?)<\/list>/g;
let match;
while ((match = listRegex.exec(xmlText)) !== null) {
  const item = match[1];
  const getValue = (tag) => {
    const m = item.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return m ? m[1].trim() : '';
  };
  const stock_code = getValue('stock_code');
  // 상장사만 (stock_code 존재)
  if (stock_code) {
    entries.push({
      corp_code: getValue('corp_code'),
      corp_name: getValue('corp_name'),
      stock_code,
    });
  }
}

const outPath = join(ROOT, 'src/lib/dart/corp-map.json');
writeFileSync(outPath, JSON.stringify(entries));
const sizeKb = (Buffer.byteLength(JSON.stringify(entries)) / 1024).toFixed(0);
console.log(`완료: 상장사 ${entries.length}개 → ${outPath} (${sizeKb}KB)`);
