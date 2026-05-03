---
name: stock-analyze
description: 종목명으로 전체 분석 파이프라인 실행 — 웹검색 직접 수행 → MDX 파일 생성 → NotebookLM 슬라이드 생성. Use when user runs /stock-analyze {종목명}.
---

# 주식 종합 분석 파이프라인

종목명을 입력받아 전체 분석 → MDX 파일 생성 → NotebookLM 아티팩트 생성까지 자동 수행한다.

## 입력

```text
$ARGUMENTS
```

첫 번째 인자가 종목명이다. (예: `/stock-analyze 삼성전자`)

## 전제 조건

- NotebookLM MCP 인증 완료 (`nlm login`)

## Workflow

### Step 1: 웹검색으로 데이터 수집

Claude Code가 직접 WebSearch 도구로 데이터를 수집한다. API 호출 없음.

**병렬로 3개 검색 실행:**
1. `"{종목명} 주식 {현재연도-2}~{현재연도}년 뉴스 실적 전망"`
2. `"{종목명} 종목코드 DART 공시 {현재연도-2}~{현재연도}년"`
3. `"{종목명} 사업 분석 핵심 사업 경쟁력"`

**추가 검색 (1차 결과 기반):**
- 종목코드 확인 (FnGuide 등에서 A코드 추출)
- 주요 뉴스 기사 WebFetch로 상세 내용 수집
- 재무 데이터 (매출, 영업이익, PER, PBR, 시가총액 등)
- 최근 이슈/테마 관련 추가 검색

**수집할 데이터:**
- `stockCode` — 종목코드 (6자리, 찾지 못하면 "000000")
- `stockName` — 종목명
- 재무 실적 (매출, 영업이익, 당기순이익, PER, PBR, 시가총액)
- 최근 뉴스/이슈 (제목, URL, 날짜)
- DART 공시 정보 (있으면)
- 사업 구조, 경쟁력, 전망

### Step 2: 분석 및 MDX 파일 생성

수집된 데이터를 바탕으로 Claude Code가 직접 5개 분석 꼭지를 도출하고 MDX를 생성한다.

**분석 꼭지 도출 기준:**
- 뉴스/이슈 기반 (📰) 과 DART 공시 기반 (📋) 을 혼합
- 각 꼭지에 감성 판단 (긍정/중립/부정)과 신뢰도 (●○ 5단계) 부여
- 핵심 포인트 3~4개 + 출처 URL 포함

**파일명 규칙:** `{종목코드}_{YYYYMMDD}.mdx`
**저장 경로:** `content/stocks/{파일명}`

**MDX 구조** (`src/lib/mdx/generate.ts`의 로직을 따른다):
```mdx
---
title: "{종목명} 종합 분석"
stockCode: "{종목코드}"
stockName: "{종목명}"
date: "YYYY-MM-DD"
angles: {선택된 꼭지 수}
---

# {종목명} 종합 분석
> 분석일: YYYY-MM-DD | 종목코드: {종목코드}

## 분석 요약
(요약 테이블: 꼭지 | 감성 | 신뢰도)

## {분석 제목 1}
> 📈 긍정 | 📰 뉴스/이슈 기반
(요약, 핵심 포인트)

**출처:**
- 📰 [기사 제목](URL) (날짜)
- 📋 [공시 제목](DART URL) (날짜)

## 용어 해설
(용어 테이블: 용어 | 설명 | 비유)
```

각 분석 항목의 출처에 반드시 다음을 포함한다:
- **뉴스 출처**: `📰` 아이콘 + 기사 제목 + URL + 날짜
- **DART 출처**: `📋` 아이콘 + 공시명 + DART URL + 접수일자
- 소스 타입 표시: `📰 뉴스/이슈 기반` 또는 `📋 DART 공시 기반`

### Step 3: NotebookLM 노트북 생성

1. **노트북 생성**:
   - `mcp__notebooklm-mcp__notebook_create` 호출
   - title: `"{종목명} 분석 ({YYYY-MM-DD})"`

2. **소스 추가**:
   - `mcp__notebooklm-mcp__source_add` — `source_type=text`, `text=MDX 전문 내용`, `title="{종목명} 분석"`
   - 주요 뉴스 URL을 `source_type=url`로 추가 (최대 5개)

### Step 4: 슬라이드 생성

- `mcp__notebooklm-mcp__studio_create`
- `artifact_type=slide_deck`, `slide_format=detailed_deck`, `language=ko`, `confirm=True`
- `focus_prompt="{종목명} 투자 분석 핵심 요약"`

### Step 5: 완료 대기

- `mcp__notebooklm-mcp__studio_status`로 상태 확인
- 15초 간격으로 폴링 (최대 20회 = 5분)
- `completed` 상태가 될 때까지 대기

### Step 6: 슬라이드 다운로드

- `mcp__notebooklm-mcp__download_artifact`
- `artifact_type=slide_deck`, `slide_deck_format=pdf`
- `output_path=content/stocks/artifacts/{종목코드}_{YYYYMMDD}_slides.pdf`

### Step 7: Git 커밋 & 푸시

생성된 파일들을 자동으로 커밋하고 푸시한다:

```bash
git add content/stocks/{종목코드}_{YYYYMMDD}.mdx content/stocks/artifacts/{종목코드}_{YYYYMMDD}_slides.pdf
git commit -m "Add {종목명} analysis ({YYYY-MM-DD})"
git push
```

- 푸시 전 사용자에게 확인을 받는다
- Vercel 연동 시 푸시하면 자동 배포됨

### Step 8: 결과 보고

```
✅ {종목명} 분석 완료!

📄 MDX: content/stocks/{종목코드}_{YYYYMMDD}.mdx
📊 슬라이드: content/stocks/artifacts/{종목코드}_{YYYYMMDD}_slides.pdf
🔗 NotebookLM: 노트북 링크
🌐 웹: /stocks/{종목코드}_{YYYYMMDD}
```

## 에러 처리

- **NotebookLM 인증 실패**: `mcp__notebooklm-mcp__refresh_auth` 시도 → 실패 시 "nlm login을 실행해주세요" 안내
- **종목코드 조회 실패**: 종목코드를 "000000"으로 대체하고 계속 진행
- **아티팩트 생성 타임아웃**: 5분 초과 시 경고 후 다운로드 건너뛰기
- **부분 실패**: 성공한 단계까지의 결과만 보고

## 참고

- MDX 파일은 `/stocks/{slug}` 경로로 웹 렌더링 가능
- 동일 종목 재분석 시 날짜가 다르면 별도 파일로 생성
