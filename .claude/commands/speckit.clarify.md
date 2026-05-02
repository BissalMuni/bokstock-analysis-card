---
description: Clarify ambiguous or underspecified areas in the feature spec
---

# Clarify 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/spec.md`를 읽는다.
2. `.spec/constitution.md`를 읽어 프로젝트 원칙을 파악한다.
3. spec에서 모호하거나 불완전한 부분을 자동 탐지한다:
   - 기능 범위, 데이터 모델, UX/UI, 비기능 요구사항, 에지 케이스
4. 탐지된 모호한 부분에 대해 최대 5개의 대화형 질문을 한다.
5. 사용자 답변을 `.spec/spec.md`의 `## Clarifications` 섹션에 기록한다.
6. 우선순위: 범위 > 보안 > UX > 기술적 세부사항
