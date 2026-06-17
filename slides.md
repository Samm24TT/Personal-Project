---
marp: true
paginate: true
transition: fade
auto-advance: 20
theme: uncover
style: |
  section { font-family: 'Segoe UI', system-ui, sans-serif; }
  h1 { font-size: 2.2em; }
  h2 { font-size: 1.6em; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  .box { border: 2px solid #6366f1; border-radius: 12px; padding: 1rem; text-align: center; }
  .box p { margin: 0.2em 0; }
  .check { color: #22c55e; }
  .pending { color: #f59e0b; }
---

<!-- slide 1 -->
# Who's my person?

![w:160](https://api.dicebear.com/9.x/notionists/svg?seed=Samuel&backgroundColor=6366f1)

**Samuel** — CS student, Malaysia 🇲🇾

🎧 Loves music. Lives on YouTube.

🎯 Always wanted to *play* the music — not just hear it.

---

<!-- slide 2 -->
# The problem

<div class="columns">
<div class="box">

### 🎸 Guitar Hero
Fixed tracklist
You play *their* songs

</div>
<div class="box">

### 🌀 osu!
Manual beatmaps
Hours of prep before you play

</div>
</div>

> **What if any MP3 could become a playable level — instantly?**

---

<!-- slide 3 -->
# 🎵 BeatStrike

<div class="columns">
<div>

**Upload** any MP3  
⬇️  
**Beats auto-detected**  
⬇️  
**Play immediately**

</div>
<div class="box">

### Controls
**D F J K**
⬅️ ⬇️ ⬆️ ➡️

### Scoring
Perfect · Good · Miss

</div>
</div>

> React + Web Audio API. No backend.

---

<!-- slide 4 -->
# How I built it

<div class="columns">
<div class="box">

### 🧠 MCP
Filesystem server
*Read & write files*

</div>
<div class="box">

### 🎯 Skill
Rhythm-game rules
*Canvas · Timing · Beats*

</div>
<div class="box" style="grid-column: 1 / -1;">

### 🤖 Agent
Beatmap generator
*Audio analysis & note generation*

</div>
</div>

**Claude Code** drove the entire build — 3 days.

---

<!-- slide 5 -->
# Why it matters

🎮 &nbsp;**Every song = a new level** — infinite replayability

⚡ &nbsp;**100% browser** — no server, no install

🏆 &nbsp;**Leaderboard** — best scores per song, local storage

> Any student with an MP3 can play. Zero setup.

---

<!-- slide 6 -->
# What's next

✅ &nbsp;Repo public — `github.com/Samm24TT/Personal-Project`

✅ &nbsp;MCP + Skill + Agent configured

✅ &nbsp;Slides built with Marp

⏳ &nbsp;`report.md` → team repo

---

<!-- slide 7 -->
# Thank you 🙏

### 🎵 BeatStrike

**Play your music.**
