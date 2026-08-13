# Open Writer — User Skills Inventory

**Date:** 2025-08-13

| Skill/Path | Purpose | Entry Point | Can Modify Files | Network | Used | Verified |
|------------|---------|-------------|------------------|---------|------|----------|
| dsh-glm | Autonomous engineering framework | `/home/user_skills/dsh-glm/bin/init.sh` | Yes | Yes | No | Yes |
| hybrid-llm (ai) | Local+managed LLM routing (0.5B-7B local, GLM-4.6 cloud) | `hybrid-llm start` | No | Yes | No | Yes |
| design-taste-frontend (taste) | Anti-slop frontend design skill | SKILL.md (prompt-based) | Yes | No | No | Yes |
| super-workspace (system) | Fast storage layer with tmpfs+bind mounts | `superws start` | Yes | No | No | Yes |
| dbx | Universal database manager (70+ DBs) | `dbx` CLI | Yes | Yes | No | Yes |
| cross-sync | Cross-session synchronization | SKILL.md | Yes | Yes | No | No |
| /DSH-GLM | NOT ACCESSIBLE — path does not exist | N/A | N/A | N/A | No | No |
| zai-report | NOT FOUND — no matching skill discovered | N/A | N/A | N/A | No | No |
| SUPERrr-FREE | NOT FOUND as standalone — taste skill provides similar anti-slop capability | N/A | N/A | N/A | No | No |

## Notes
- DSH-GLM is available as a user skill at `/home/user_skills/dsh-glm/` (NOT `/DSH-GLM`)
- The `taste` skill provides design intelligence similar to SUPERrr-FREE's anti-slop heuristics
- `hybrid-llm` could be used for local model routing but is not a runtime dependency
- All skills are development-time capabilities, NOT runtime dependencies of Open Writer
