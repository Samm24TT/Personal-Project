---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---
<!-- slide 1 -->
# Who's my person?
<!-- 20s -->
**Samuel** — CS student in Malaysia 🇲🇾  
Loves music. Spends hours on YouTube listening to songs.  
Always wanted to *play* the music, not just hear it.

---
<!-- slide 2 -->
# Their problem
<!-- 20s -->
No rhythm game lets you play **your own songs**.  
Guitar Hero? Fixed tracklist.  
osu!? Manual beatmaps only.  
> "What if any MP3 could become a playable level — instantly?"

---
<!-- slide 3 -->
# What I built
<!-- 20s -->
### 🎵 BeatStrike
A 4-lane browser rhythm game.  
Upload **any MP3** → beats auto-detected → play immediately.  
Press **D F J K** to hit notes. Score: Perfect / Good / Miss.  
Built with React + Web Audio API. No backend needed.

---
<!-- slide 4 -->
# How I built it
<!-- 20s -->
- MCP: `.mcp.json` — filesystem server for reading/writing project files
- Skill: `.claude/skills/rhythm-game/SKILL.md` — canvas rendering patterns, hit-timing windows, beat detection thresholds
- Agent: `.claude/agents/beatmap-generator.md` — specialist for Web Audio API analysis and note generation

---
<!-- slide 5 -->
# Why it matters
<!-- 20s -->
🎮 Every song is a new level — infinite replayability  
⚡ Beat detection runs entirely in the browser — no server needed  
🏆 Leaderboard tracks your best scores per song  
🎨 Glassmorphism UI with combo multipliers and visual effects  

Any student with an MP3 can play. Zero setup.

---
<!-- slide 6 -->
# Done checklist
<!-- 20s -->
- [x] repo public — github.com/Samm24TT/Personal-Project
- [x] MCP + skill + agent used
- [ ] report.md in team repo
