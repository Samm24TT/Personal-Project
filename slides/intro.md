<!--
  Marp template — "minimal-docs"
  Copy into your repo (e.g. slides/intro.md), replace content.
  Render:  marp slides/intro.md -o slides.html   (or .pdf / .png)
  Clean, lots of whitespace — reads like good documentation.
-->

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

# Project Name

BeatStrike

## one line — what it does, in plain words

Samuel · https://github.com/Samm24TT · vibecode.tours

---

### Overview

# What it is

- A 4-lane browser rhythm game. Upload any MP3 — beats are detected automatically — and play instantly. No backend, no beatmap files, no setup.

---

### Under the hood

# How it works

1. **Upload an MP3** — drag & drop or click to pick a song
2. **Wait for beat detection** — the game analyzes the audio in your browser
3. **Press the keys** as notes fall down the four lanes:

| Lane    | Key   |
| ------- | ----- |
| Left-1  | **D** |
| Left-2  | **F** |
| Right-1 | **J** |
| Right-2 | **K** |

## Stack:

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Framework | React 19 + Vite 8                            |
| Rendering | HTML5 Canvas                                 |
| Audio     | Web Audio API (AnalyserNode, beat detection) |
| Styling   | CSS (glassmorphism, animations)              |
| Storage   | localStorage (leaderboard)                   |
| Hosting   | Vercel (static deploy, `vite build`)         |

---

### Screens

# Demo

![w:1918](screenshots/start-screen.png)
![w:1918](screenshots/gameplay.png)
![w:1918](screenshots/leaderboard.png)

---

### Get started

# Links

- **Live:** https://personal-project-xi-coral.vercel.app/
- **Repo:** https://github.com/Samm24TT/Personal-Project/
- **License:** MIT
