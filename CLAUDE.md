# Project: bokstock-analysis-card

주식 분석 카드뉴스 생성 위자드

@AGENTS.md

## Rules

- Use pnpm as package manager
- Use vitest for testing
- Write code comments in Korean
- Write commit messages in English
- Follow spec-kit workflow: constitution → spec → plan → implement
- Refer to `.spec/` for project specifications

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Zustand (state management)
- Vercel (deployment)

## Architecture

- `src/lib/prompts/` — 프롬프트 파이프라인 (템플릿, 레지스트리, 실행기)
- `src/lib/store/` — Zustand 위자드 상태
- `src/lib/mock/` — Phase 1 더미 데이터 (추후 웹검색/API로 교체)
- `src/components/wizard/` — 6단계 위자드 UI 컴포넌트
- `src/components/ui/` — 공통 UI 컴포넌트

## Data Source Strategy

Phase 1: mock data → Phase 2: web search → Phase 3: Claude API + 증권 API
