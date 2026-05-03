# Tasks — bokstock-analysis-card

## Phase 1: Setup

- [x] [T001] 타입 정의 — `src/lib/types/wizard.ts` (WizardStep, WizardState)
- [x] [T002] 타입 정의 — `src/lib/types/stock.ts` (AnalysisAngle, AnalysisResult, Term, OutputFormat)
- [x] [T003] 프롬프트 타입 — `src/lib/prompts/types.ts` (PromptTemplate, PromptChain)
- [x] [T004] 프롬프트 템플릿 — `src/lib/prompts/templates/step1-stock-angles.ts`
- [x] [T005] 프롬프트 템플릿 — `src/lib/prompts/templates/step2-angle-analysis.ts`
- [x] [T006] 프롬프트 템플릿 — `src/lib/prompts/templates/step3-term-extraction.ts`
- [x] [T007] 프롬프트 템플릿 — `src/lib/prompts/templates/step4-format-output.ts`
- [x] [T008] 프롬프트 레지스트리 — `src/lib/prompts/registry.ts`
- [x] [T009] 프롬프트 실행기 — `src/lib/prompts/index.ts` (executeStep)
- [x] [T010] Mock 데이터 — `src/lib/mock/angles.ts`
- [x] [T011] Mock 데이터 — `src/lib/mock/analysis.ts`
- [x] [T012] Mock 데이터 — `src/lib/mock/terms.ts`
- [x] [T013] Mock 리졸버 — `src/lib/mock/resolver.ts`
- [x] [T014] Zustand 스토어 — `src/lib/store/wizard-store.ts`
- [x] [T015] Zustand 설치 — `pnpm add zustand`

## Phase 2: UI

- [x] [T016] UI 컴포넌트 — `src/components/ui/Button.tsx`
- [x] [T017] UI 컴포넌트 — `src/components/ui/Card.tsx`
- [x] [T018] UI 컴포넌트 — `src/components/ui/Chip.tsx`
- [x] [T019] UI 컴포넌트 — `src/components/ui/ProgressBar.tsx`
- [x] [T020] UI 컴포넌트 — `src/components/ui/TextInput.tsx`
- [x] [T021] 위자드 셸 — `src/components/wizard/WizardShell.tsx`
- [x] [T022] Step 1 — `src/components/wizard/StepStockInput.tsx`
- [x] [T023] Step 2 — `src/components/wizard/StepAngleSelect.tsx`
- [x] [T024] Step 3 — `src/components/wizard/StepAnalysisReview.tsx`
- [x] [T025] Step 4 — `src/components/wizard/StepTermSelect.tsx`
- [x] [T026] Step 5 — `src/components/wizard/StepFormatSelect.tsx`
- [x] [T027] Step 6 — `src/components/wizard/StepFinalOutput.tsx`
- [x] [T028] 위자드 레이아웃 — `src/app/wizard/layout.tsx`
- [x] [T029] 위자드 페이지 — `src/app/wizard/page.tsx`
- [x] [T030] 홈 리다이렉트 — `src/app/page.tsx` → `/wizard`

## Phase 3: Polish

- [x] [T031] 반응형 디자인 — 모바일 375px ~ 데스크톱 1440px
- [x] [T032] 스텝 전환 애니메이션 — 300ms 이내
- [x] [T033] 테스트 — Zustand 스토어 단위 테스트
- [x] [T034] 테스트 — 프롬프트 파이프라인 단위 테스트
- [ ] [T035] 테스트 — 위자드 컴포넌트 통합 테스트 (Phase 3 이후)

## Phase 4: Data (제품 Phase 2~3)

- [ ] [T036] API 라우트 — `src/app/api/analyze/route.ts`
- [ ] [T037] 웹 검색 연결 — mock resolver를 실제 데이터로 교체
- [ ] [T038] Claude API 연결 — 프롬프트 실행기에 Anthropic SDK 통합
