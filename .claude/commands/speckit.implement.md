---
description: Execute implementation based on plan and tasks
---

# Implement 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/` 디렉토리의 모든 파일을 읽는다 (constitution, spec, plan, tasks).
2. tasks.md가 있으면 작업 목록을 따라 구현한다. 없으면 plan.md를 기반으로 구현한다.
3. 구현 규칙:
   - constitution 원칙을 준수한다
   - Phase 순서대로 진행한다 (Setup → Core → Features → Polish)
   - 각 작업 완료 시 tasks.md에서 체크한다: `- [x]`
   - 테스트가 필요한 경우 vitest로 작성한다
4. 구현 완료 후 spec 기준으로 검증한다.
5. 진행 상황을 보고한다.
