# AI Tools Used in BeatStrike

## Primary

| Tool | Purpose | Usage |
|------|---------|-------|
| **Claude Code** | Main AI assistant | Implementation, debugging, code review, test generation, documentation |
| **Claude Code Skill** | Project-specific guidance | `.claude/skills/rhythm-game/SKILL.md` — architecture rules, canvas rendering, beat detection pipeline |
| **Claude Code Agent** | Specialist subagent | `.claude/agents/beatmap-generator.md` — beat detection and beatmap generation tuning |
| **MCP Filesystem** | Direct file access | `.mcp.json` — read/write/search/edit project files without copy-paste |

## How They Were Used

### Claude Code
- Scaffolded the entire project from zero to working game
- Implemented all game features: canvas renderer, input system, audio pipeline, scoring, leaderboard
- Generated 90+ unit tests across 5 test files
- Debugged Web Audio API timing issues and canvas rendering bugs
- Created all documentation (README, slides, reports)
- Refactored code for performance and maintainability

### Skill (rhythm-game)
- Provided architecture rules (state management, clock system, file boundaries)
- Defined canvas draw order and visual effects lifecycle
- Documented the 7-stage beat detection pipeline
- Established code style conventions (naming, AudioContext rules)
- Referenced during every coding session for consistency

### Agent (beatmap-generator)
- Tuned onset detection parameters (threshold, gap, density caps)
- Debugged beat distribution across lanes
- Verified fallback BPM generation for complex rhythms
- Ensured ≤ 4 notes/sec global cap for playability

### MCP Filesystem
- Read source files for analysis and debugging
- Created new components, tests, and documentation
- Searched codebase for patterns and dependencies
- Applied targeted edits without manual file navigation
