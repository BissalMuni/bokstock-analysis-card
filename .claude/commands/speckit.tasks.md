---
description: Generate actionable task list from the implementation plan
---

# Tasks 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/plan.md`와 `.spec/spec.md`를 읽는다.
2. `.spec/tasks.md`를 생성한다.
3. plan을 실행 가능한 작업 목록으로 분해한다:
   - 형식: `- [ ] [T001] 작업 설명 (파일 경로)`
   - Phase별 그룹핑: Setup → Core → Features → Polish
   - 의존성 순서 고려
   - 각 작업은 독립적으로 실행/검증 가능해야 한다
4. 작업 수와 예상 Phase를 요약 보고한다.
