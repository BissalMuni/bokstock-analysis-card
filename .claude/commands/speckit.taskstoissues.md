---
description: Convert tasks into GitHub issues
---

# Tasks to Issues 워크플로우

## 입력

```text
$ARGUMENTS
```

사용자 입력이 있으면 반영한다.

## 절차

1. `.spec/tasks.md`를 읽어 작업 목록을 파싱한다.
2. Git remote URL이 GitHub인 경우에만 진행한다.
3. 각 작업에 대해 `gh issue create`로 GitHub Issue를 생성한다.
4. **절대로 remote URL과 다른 리포지토리에 Issue를 생성하지 않는다.**
