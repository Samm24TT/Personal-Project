---
marp: true
paginate: true
size: 16:9
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root { --bg:#ffffff; --ink:#111827; --muted:#9ca3af; --accent:#111827; --line:#e5e7eb; --code:#f6f7f9; }
section {
  background:var(--bg); color:var(--ink);
  font-family:'Inter','Noto Sans','Pyidaungsu',sans-serif;
  font-size:26px; line-height:1.6; padding:64px 88px;
}
h1 { color:var(--ink); font-weight:700; font-size:1.7em; letter-spacing:-.01em; }
h2 { color:var(--ink); font-weight:600; }
h3 { color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.06em; font-size:.8em; }
strong { color:var(--ink); font-weight:700; }
a { color:#2563eb; text-decoration:none; }
code { background:var(--code); color:#be123c; padding:.06em .35em; border-radius:4px; font-family:'JetBrains Mono',monospace; }
pre  { background:var(--code); border:1px solid var(--line); border-radius:8px; }
pre code { background:none; color:#111827; }
blockquote { border-left:3px solid var(--line); color:var(--muted); padding:.4em 1em; }
table th { background:var(--code); }
table td, table th { border-color:var(--line); }
header,footer,section::after { color:var(--muted); font-size:.5em; }
section.cover h1 { font-size:2.3em; }
section.cover h2 { color:var(--muted); font-weight:400; }
section.lead { background:#fafafa; }
</style>

<!-- _class: cover -->

# Tech Stack & AI Tooling

BeatStrike — AI-assisted development walkthrough

Samuel · https://github.com/Samm24TT

---

### Stack

# Technology Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | React 19 + Vite 8 | Fast HMR, modern tooling |
| Rendering | HTML5 Canvas | 60fps game loop, pixel-level control |
| Audio | Web Audio API | In-browser beat detection, no server |
| Styling | CSS (glassmorphism) | Modern UI, no extra dependencies |
| Storage | localStorage | Per-song leaderboards, zero backend |
| Testing | Vitest | Fast unit tests, Vite-native |
| Hosting | Vercel | Static deploy, instant rollbacks |

---

### Agents

# Subagent: Beatmap Generator

**File:** `.claude/agents/beatmap-generator.md`

Specialist agent for the beat detection and beatmap generation pipeline.

| Capability | Detail |
|------------|--------|
| Scope | `audioAnalyzer.js`, `beatmap.js`, `constants.js` |
| Pipeline | 7-stage: RMS → spectral flux → threshold → peak pick → filter → rate cap |
| Rules | ≤ 4 notes/sec, ≥ 300ms same-lane gap, threshold 1.2–2.2 |
| Fallback | BPM-based beat generation when < 10 onsets detected |

---

### Skills

# Skill: Rhythm Game Development

**File:** `.claude/skills/rhythm-game/SKILL.md`

Project-specific guidance for BeatStrike development.

| Section | What it covers |
|---------|----------------|
| Project Map | Full file tree with one-line descriptions |
| Architecture Rules | State management, clock system, file boundaries |
| Canvas Rendering | Draw order, visual effects lifecycle |
| Beat Detection | 7-stage pipeline details |
| Data Flow | MP3 → notes → game loop diagram |
| Scoring | Timing windows, combo multiplier, accuracy |
| Code Style | Naming conventions, AudioContext rules |

---

### Methodology

# How I Built It

| Phase | What happened |
|-------|---------------|
| **Scaffold** | React + Vite setup, Canvas basics, game loop |
| **Input + Judgement** | Keyboard manager, hit detection, scoring |
| **Audio Pipeline** | MP3 upload, Web Audio API, beat detection |
| **Beatmap Engine** | Onset detection, lane distribution, density control |
| **Visual Polish** | Glassmorphism, particles, hit effects, combo display |
| **UX Features** | Pause/resume, settings panel, leaderboard |
| **Testing** | Vitest unit tests for all engine modules |

---

### Trigger & Commands

# How I Use Claude Code

| Trigger | Command | What it does |
|---------|---------|--------------|
| Start dev | `npm run dev` | Launches Vite dev server |
| Run tests | `npm test` | Runs Vitest test suite |
| Build | `npm run build` | Production build for Vercel |
| Beat agent | "Use the beatmap generator agent to tune onset detection" | Activates specialist agent |
| Skill context | Automatic when working on game files | Loads rhythm-game SKILL.md |

---

### MCP

# MCP Filesystem Server

**Config:** `.mcp.json`

| Feature | Usage |
|---------|-------|
| Read files | Read source code for analysis |
| Write files | Create/update components, tests, docs |
| Search files | Find patterns across codebase |
| Edit files | Targeted line-based edits |

MCP provides Claude Code direct filesystem access — no copy-paste needed.

---

<!-- _class: cover -->

# Live Demo

https://personal-project-xi-coral.vercel.app/

Upload any MP3 → auto-detect beats → play!
