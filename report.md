chapter: ch-4
github_username: Samm24TT
personal_repo_url: https://github.com/Samm24TT/Personal-Project.git
slides_url: slides.md
stars: 3
project_summary: A 4-lane browser rhythm game where any MP3 becomes a playable level — beat detection via Web Audio API, instant play with no backend or setup required.

## One-line summary
Upload any MP3 and play it as a rhythm game — beats auto-detected, no setup needed.

## Live URL
https://personal-project-xi-coral.vercel.app/

## Screenshots
path: screenshots/start-screen.png
path: screenshots/gameplay.png
path: screenshots/leaderboard.png

## License
MIT License — see LICENSE file

## Methodology
Project-based approach: each feature phase (scaffold + canvas renderer, keyboard input + hit judgement, MP3 upload + beat detection, visual polish, leaderboard) was planned and implemented incrementally, tracked via git commits. Git workflow followed commit-as-you-build — every feature, refactor, and bugfix committed separately with descriptive messages. Claude Code was used throughout for implementation, debugging, code review, and test generation, with MCP/Skill/Agent tooling providing direct filesystem access and domain-specific game development assistance.

## Evidence
path: .mcp.json
path: .claude/skills/rhythm-game/SKILL.md
path: .claude/agents/beatmap-generator.md
result: PASS
