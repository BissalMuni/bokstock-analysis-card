# Checklist — Consistency (일관성)

문서 간 정의가 서로 모순 없이 일치하는가?

## 문서 간 정합

- [ ] CHK201 - constitution의 기술 스택과 plan의 의존성이 일치하는가? [Consistency, constitution↔plan]
- [ ] CHK202 - spec의 6단계 흐름과 plan의 파일 구조(6개 Step 컴포넌트)가 1:1 대응하는가? [Consistency, spec↔plan]
- [ ] CHK203 - plan의 프롬프트 템플릿 4개와 매핑 테이블이 일치하는가? [Consistency, plan]
- [ ] CHK204 - tasks.md의 작업 항목이 plan의 구현 순서를 빠짐없이 반영하는가? [Consistency, plan↔tasks]
- [ ] CHK205 - CLAUDE.md의 Architecture 섹션이 plan의 파일 구조를 정확히 반영하는가? [Consistency, CLAUDE.md↔plan]

## 용어 일관성

- [ ] CHK206 - "꼭지" vs "분석 각도" vs "angle" 용어가 문서 전체에서 통일되어 있는가? [Clarity, spec↔plan]
- [ ] CHK207 - Phase 번호 체계(Impl-N vs 제품 Phase N)가 모든 문서에서 일관되는가? [Clarity, all docs]

## 데이터 흐름

- [ ] CHK208 - mock resolver가 반환하는 데이터 형태와 컴포넌트가 기대하는 타입이 일치하도록 정의되어 있는가? [Consistency, plan]
- [ ] CHK209 - Zustand 스토어의 상태 필드가 6단계 각각에서 필요한 데이터를 모두 포함하는가? [Completeness, plan]
