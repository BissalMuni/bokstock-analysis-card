---
description: Create technical implementation plan based on spec
---

# Plan 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/constitution.md`와 `.spec/spec.md`를 읽는다.
2. `.spec/plan.md`를 읽는다 (없으면 새로 생성).
3. 다음을 설계한다:
   - 아키텍처 개요
   - 파일 구조
   - 의존성 목록
   - 구현 순서 (우선순위별)
   - 기술적 결정 사항과 근거
4. constitution 원칙과의 정합성을 검증한다.
5. `.spec/plan.md`에 결과를 기록한다.
