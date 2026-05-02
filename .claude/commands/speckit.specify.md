---
description: Define feature specifications with user stories and requirements
---

# Specification 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/constitution.md`를 읽어 프로젝트 원칙을 파악한다.
2. `.spec/spec.md`를 읽는다 (없으면 새로 생성).
3. 사용자와 대화하여 기능 요구사항을 정의한다:
   - 유저 스토리 (As a... I want... So that...)
   - 기능 요구사항 (구체적, 측정 가능)
   - 성공 기준
   - 불명확한 부분은 [NEEDS CLARIFICATION]으로 표시 (최대 3개)
4. `.spec/spec.md`에 결과를 기록한다.
5. **WHAT과 WHY**에 집중하고, **HOW**는 포함하지 않는다.
