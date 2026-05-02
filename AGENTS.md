<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

This project uses spec-kit for Spec-Driven Development.

## Workflow

1. `/speckit.constitution` — Define project principles
2. `/speckit.specify` — Define feature requirements
3. `/speckit.clarify` — Clarify ambiguous requirements
4. `/speckit.plan` — Create implementation plan
5. `/speckit.tasks` — Generate task list
6. `/speckit.implement` — Execute implementation
7. `/speckit.analyze` — Cross-document consistency check
8. `/speckit.checklist` — Quality validation checklist

## Key Directories

- `.spec/` — Project specifications (constitution, spec, plan)
- `src/lib/prompts/` — Prompt pipeline templates
- `src/lib/store/` — Zustand wizard state
- `src/lib/mock/` — Mock data for Phase 1
- `src/components/wizard/` — Wizard step components
