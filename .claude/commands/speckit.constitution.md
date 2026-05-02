---
description: Create or update project constitution (governing principles, tech stack, conventions)
---

# Constitution 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다 (없으면 대화형으로 진행).

## 절차

1. `.spec/constitution.md`를 읽는다 (없으면 새로 생성).
2. 사용자와 대화하여 다음을 정의한다:
   - 기술 스택 및 프레임워크
   - 코딩 컨벤션 (언어, 스타일, 네이밍)
   - 비기능 요구사항 (성능, 보안, 접근성)
   - 프로젝트 제약 조건
3. `.spec/constitution.md`에 결과를 기록한다.
4. `CLAUDE.md`에 관련 지시사항을 반영한다.
