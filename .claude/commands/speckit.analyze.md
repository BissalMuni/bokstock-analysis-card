---
description: Cross-artifact consistency analysis (read-only)
---

# Analyze 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/` 디렉토리의 모든 파일을 읽는다 (constitution, spec, plan, tasks).
2. 교차 분석 수행: 중복, 모호성, 갭, Constitution 위반, 일관성 검증.
3. Markdown 보고서 출력: Severity별 분류 (CRITICAL / WARNING / INFO).
4. **읽기 전용**: 파일을 수정하지 않는다.
