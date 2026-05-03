# Plan — bokstock-analysis-card

## 아키텍처 개요

```
┌─────────────────────────────────────────────┐
│  app/wizard/page.tsx  (Step Controller)      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Step 1  │→│ Step 2  │→│ Step 3  │→ ...  │
│  └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │              │
│  ┌────▼───────────▼───────────▼────┐        │
│  │    Zustand Store (wizard-store)  │        │
│  └────────────────┬────────────────┘        │
│                   │                          │
│  ┌────────────────▼────────────────┐        │
│  │  lib/prompts/ (Pipeline Engine)  │        │
│  │  templates → registry → executor │        │
│  └────────────────┬────────────────┘        │
│                   │                          │
│  ┌────────────────▼────────────────┐        │
│  │  Phase 1: mock/   (더미 데이터)  │        │
│  │  Phase 2: 웹 검색                │        │
│  │  Phase 3: Claude API             │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                     # → /wizard로 리다이렉트
│   ├── globals.css
│   ├── wizard/
│   │   ├── layout.tsx               # 위자드 공통 레이아웃
│   │   └── page.tsx                 # 스텝 컨트롤러
│   └── api/
│       └── analyze/
│           └── route.ts             # Claude API 연결 지점 (Phase 2)
├── components/
│   ├── wizard/
│   │   ├── WizardShell.tsx          # 진행바 + 네비게이션 래퍼
│   │   ├── StepStockInput.tsx       # Step 1
│   │   ├── StepAngleSelect.tsx      # Step 2
│   │   ├── StepAnalysisReview.tsx   # Step 3
│   │   ├── StepTermSelect.tsx       # Step 4
│   │   ├── StepFormatSelect.tsx     # Step 5
│   │   └── StepFinalOutput.tsx      # Step 6
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Chip.tsx
│       ├── ProgressBar.tsx
│       └── TextInput.tsx
├── lib/
│   ├── prompts/
│   │   ├── types.ts                 # PromptTemplate, PromptChain 타입
│   │   ├── templates/
│   │   │   ├── step1-stock-angles.ts
│   │   │   ├── step2-angle-analysis.ts
│   │   │   ├── step3-term-extraction.ts
│   │   │   └── step4-format-output.ts
│   │   ├── registry.ts              # 체인 순서 + 의존성
│   │   └── index.ts                 # 오케스트레이터 (executeStep)
│   ├── store/
│   │   └── wizard-store.ts          # Zustand 상태 관리
│   ├── types/
│   │   ├── wizard.ts                # WizardState, WizardStep
│   │   └── stock.ts                 # AnalysisAngle, AnalysisResult, Term 등
│   └── mock/
│       ├── angles.ts                # 분석 꼭지 더미
│       ├── analysis.ts              # 분석 결과 더미
│       ├── terms.ts                 # 용어 해설 더미
│       └── resolver.ts             # templateId → mock 매핑
```

## 프롬프트 ↔ UI 스텝 매핑

| UI 스텝 | 컴포넌트 | 프롬프트 템플릿 | 설명 |
|---------|----------|----------------|------|
| Step 1 | StepStockInput | — | 사용자 입력만, 프롬프트 불필요 |
| Step 2 | StepAngleSelect | `step1-stock-angles` | 종목명 → 분석 꼭지 5~7개 생성 |
| Step 3 | StepAnalysisReview | `step2-angle-analysis` | 선택된 꼭지 → 분석 결과 생성 |
| Step 4 | StepTermSelect | `step3-term-extraction` | 분석 결과 → 어려운 용어 추출 |
| Step 5 | StepFormatSelect | — | 출력 형식 선택만, 프롬프트 불필요 |
| Step 6 | StepFinalOutput | `step4-format-output` | 선택된 형식으로 최종 결과물 생성 |

## 의존성

```json
{
  "zustand": "^5"
}
```

devDependencies는 Next.js 기본 + vitest + testing-library

## 구현 순서

### Impl-1: Setup (제품 Phase 1)

1. 타입 정의 (wizard.ts, stock.ts)
2. 프롬프트 파이프라인 (types → templates → registry → executor)
3. Mock 데이터
4. Zustand 스토어

### Impl-2: UI (제품 Phase 1)

5. UI 기본 컴포넌트 (Button, Card, Chip, ProgressBar, TextInput)
6. WizardShell (진행바 + 네비게이션)
7. Step 1~6 컴포넌트
8. 위자드 페이지 연결

### Impl-3: Polish (제품 Phase 1)

9. 반응형 디자인
10. 애니메이션 (스텝 전환)
11. 테스트 작성 (스토어, 프롬프트 파이프라인, 위자드 컴포넌트)

### Impl-4: Data (제품 Phase 2~3)

12. API 라우트 구현
13. 웹 검색 연결 (제품 Phase 2)
14. Claude API 연결 (제품 Phase 3)

## 기술적 결정

| 결정 | 근거 |
|------|------|
| Zustand over Context | 위자드 상태가 6단계에 걸쳐 복잡하게 흐름, 보일러플레이트 최소화 |
| 프롬프트 템플릿 분리 | API 연결 시 `lib/prompts/index.ts` 한 파일만 수정 |
| Mock 우선 개발 | UI/UX 흐름을 먼저 검증한 뒤 데이터 소스 교체 |
| App Router | Vercel 최적화 + 서버 컴포넌트 활용 가능 |
