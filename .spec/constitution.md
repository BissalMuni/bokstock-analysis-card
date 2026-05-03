# Constitution — bokstock-analysis-card

## 프로젝트 개요

주식 분석 카드뉴스 생성 위자드. 종목명을 입력하면 단계별 인터랙션을 거쳐 카드뉴스 형태의 분석 콘텐츠를 생성한다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand v5
- **Testing**: Vitest + React Testing Library
- **Package Manager**: pnpm
- **Deployment**: Vercel
- **AI (Phase 2)**: Claude API (Anthropic SDK)

## 코딩 컨벤션

- 코드 주석은 한국어로 작성
- 커밋 메시지는 영어로 작성
- 컴포넌트: PascalCase (`StepStockInput.tsx`)
- 유틸/훅: camelCase (`useWizardStore.ts`)
- 타입: PascalCase, `interface` 우선 사용
- 파일 구조: feature 기반 (wizard/, ui/)

## 비기능 요구사항

- **성능**: 첫 페이지 로드 3초 이내 (Vercel Edge)
- **반응형**: 모바일 우선 디자인 (375px ~ 1440px)
- **접근성**: 키보드 내비게이션, 적절한 ARIA 레이블
- **국제화**: UI는 한국어 단일 언어

## 제약 조건

- Phase 1에서는 AI API 호출 없이 mock 데이터 + 프롬프트 템플릿 구조만 구현
- 데이터 소스 우선순위: mock → 웹 검색 → 증권 API
- 프롬프트 템플릿은 컴포넌트와 완전히 분리하여 추후 API 연결 시 한 파일만 수정
