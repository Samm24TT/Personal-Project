chapter: ch-5
github_username: Samm24TT
personal_repo_url: https://github.com/Samm24TT/Personal-Project.git
live_url: https://personal-project-xi-coral.vercel.app/
team_repo: team-05
slides_url: slides/tech-stack.md
feedback_url: feedback-form.md
ai_tools_url: ai-tools.md

## One-line summary
Upload any MP3 and play it as a rhythm game — beats auto-detected, no setup needed.

## Live URL
https://personal-project-xi-coral.vercel.app/

## Project Repo
https://github.com/Samm24TT/Personal-Project

## Skill + Subagent

### Skill: Rhythm Game Development
- **File:** `.claude/skills/rhythm-game/SKILL.md`
- **Purpose:** Project-specific guidance for BeatStrike — architecture rules, canvas rendering, beat detection pipeline, code style conventions
- **Used for:** Every coding session — provided context on state management, file boundaries, draw order, and timing rules

### Subagent: Beatmap Generator
- **File:** `.claude/agents/beatmap-generator.md`
- **Purpose:** Specialist agent for beat detection and beatmap generation pipeline
- **Used for:** Tuning onset detection, verifying lane distribution, debugging density issues, ensuring playability constraints (≤ 4 notes/sec)

## AI Tools Used

| Tool | Purpose |
|------|---------|
| **Claude Code** | Main AI assistant — implementation, debugging, code review, test generation, documentation |
| **Claude Code Skill** | `.claude/skills/rhythm-game/SKILL.md` — architecture rules, canvas rendering, beat detection |
| **Claude Code Agent** | `.claude/agents/beatmap-generator.md` — beat detection specialist |
| **MCP Filesystem** | `.mcp.json` — direct file read/write/search/edit without copy-paste |

Full details: [ai-tools.md](ai-tools.md)

## Tech-Stack Deck

**File:** `slides/tech-stack.md`

Covers: stack, agents, skills, methodology, trigger, commands, MCP integration.

## Methodology

| Phase | What happened |
|-------|---------------|
| **Scaffold** | React + Vite setup, Canvas basics, game loop |
| **Input + Judgement** | Keyboard manager, hit detection, scoring |
| **Audio Pipeline** | MP3 upload, Web Audio API, beat detection |
| **Beatmap Engine** | Onset detection, lane distribution, density control |
| **Visual Polish** | Glassmorphism, particles, hit effects, combo display |
| **UX Features** | Pause/resume, settings panel, leaderboard |
| **Testing** | Vitest unit tests for all engine modules (90+ tests) |

Claude Code was used throughout for implementation, debugging, code review, and test generation. The Skill provided architecture guidance, and the Agent handled beat detection tuning. MCP enabled direct filesystem access for efficient development.

## Feedback

**File:** `feedback-form.md`

Structured feedback form covering:
- First impressions (ease of use, visual design)
- Gameplay (beat detection, difficulty, controls)
- Features (upload, pause, settings, leaderboard)
- Overall rating and improvement suggestions

Collected from 5 users, summarized at the bottom of the form.

## Evidence

| File | Status |
|------|--------|
| `.claude/skills/rhythm-game/SKILL.md` | ✅ Present |
| `.claude/agents/beatmap-generator.md` | ✅ Present |
| `.mcp.json` | ✅ Present |
| `slides/tech-stack.md` | ✅ Present |
| `ai-tools.md` | ✅ Present |
| `feedback-form.md` | ✅ Present |
| `report.md` (this file) | ✅ Present |

**Result:** PASS
