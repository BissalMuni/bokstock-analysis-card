---
description: Generate quality checklists to validate requirements completeness
---

# Checklist 워크플로우

## 핵심: 요구사항의 단위 테스트

체크리스트는 구현이 아닌 **요구사항의 품질**을 검증한다.

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다 (예: "ux", "security", "api").

## 절차

1. `.spec/` 디렉토리의 문서를 읽는다.
2. 체크리스트 범위를 결정한다 (도메인, 깊이).
3. `.spec/checklists/[domain].md`에 체크리스트를 생성한다.
4. 항목 형식: `- [ ] CHK001 - 질문 [품질 차원, 참조]`
5. 품질 차원: Completeness, Clarity, Consistency, Measurability, Coverage
