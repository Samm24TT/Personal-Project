# Rhythm Game Development Skill

Project-specific guidance for working on BeatStrike, a 4-lane browser rhythm
game built with React + Vite.  Players upload an MP3, beats are detected via
Web Audio API, and notes fall in sync with the music.

## Project Map

```
src/
├── main.jsx                        React entry point
├── App.jsx                         State machine: upload → playing;
│                                   owns shared AudioContext; threads
│                                   songTitle through to Game
├── constants.js                    All magic numbers live here
├── components/
│   ├── Game.jsx                    Canvas, rAF loop, input, audio
│   │                               playback, leaderboard flow
│   ├── Game.css                    Overlay & leaderboard styles
│   ├── StartScreen.jsx             Drag-drop / browse MP3 upload
│   └── StartScreen.css
└── engine/
    ├── audioAnalyzer.js            Offline onset detection + BPM
    │                               fallback
    ├── beatmap.js                  Round-robin lane distribution
    │                               with same-lane gap enforcement
    ├── renderer.js                 All canvas drawing functions
    ├── input.js                    Keyboard manager (consume-on-read
    │                               pattern for D/F/J/K)
    ├── scoring.js                  Hit judgement + combo multiplier
    └── leaderboard.js              localStorage persistence
```

## Architecture Rules

### State

- All per-frame game state lives in `stateRef` (a `useRef`) — **never**
  `useState` for anything touched inside `requestAnimationFrame`.
  React state is only for UI mode switches: `songPhase` (playing /
  nameInput / leaderboard), `playerName`, `leaderboard`.
- The mount `useEffect` **must** reset every field in `stateRef` to
  avoid leaking state across replays.

### Clock

- The game clock is `audioCtx.currentTime - startOffsetRef.current`.
  `startOffsetRef` is set to the *future* time when audio will begin
  (`audioCtx.currentTime + COUNTDOWN_S`), so `songTimeS` is negative
  during the countdown and exactly 0 when the music starts.
- **Never** use `performance.now()` or frame counts for note timing.
- Audio is scheduled with `source.start(startAt)` — the delay is
  baked into the Web Audio scheduling, not a `setTimeout`.

### File Boundaries

| Concern | File |
|---|---|
| Drawing | `src/engine/renderer.js` only |
| Beat detection | `src/engine/audioAnalyzer.js` only |
| Note → lane mapping | `src/engine/beatmap.js` only |
| Hit judgement | `src/engine/scoring.js` only |
| Keyboard input | `src/engine/input.js` only |
| Score persistence | `src/engine/leaderboard.js` only |
| Constants | `src/constants.js` — no magic numbers in components |

## Canvas Rendering

### Draw order (must match this)

```
drawLanes          — background + lane strips + key-press flash overlay
drawHitZone        — hit bar + expanding hit-effect rings
drawLaneLabels     — D/F/J/K circles at top of each lane
drawSongTitle      — filename (centered top, auto-truncated)
drawNotes          — active notes (rounded rects with glow)
drawFeedback       — PERFECT/GOOD/MISS text (large, per-lane, glowing)
drawCombo          — big centered counter above hit zone (≥ 10x only)
drawScorePanel     — glassmorphism card upper-left (score, combo, accuracy)
drawProgressBar    — bottom bar with lane-colour gradient + time labels
```

- Canvas is fully cleared via `drawLanes` each frame (fills background).
- `drawCountdown` is a **separate path** called only during the
  countdown phase — it renders the 3-2-1-GO overlay on top of a
  semi-transparent backdrop.

### Visual effects lifecycle

- **Lane flash**: set to 1 on keypress, decays 0.12 per frame.
- **Hit rings**: spawned on Perfect/Good, expand 2.5 px/frame, fade
  0.035 opacity/frame, removed when opacity ≤ 0.
- **Feedback text**: fades over 700 ms, floats upward.
- **Score delta**: "+N" pop-up inside score panel, fades over 800 ms.

## Beat Detection Pipeline

7-stage pipeline in `audioAnalyzer.js`:

1. Split audio into 1024-sample frames with 512-sample hop (50% overlap)
2. Per-frame RMS energy
3. Spectral flux (positive energy delta only)
4. Adaptive threshold — running mean × 1.8
5. Peak picking — min 150 ms global gap, return `{ frameIdx, fluxValue }` objects
6. **Strength filter** — sort by flux value desc, keep top 40%
7. **Global rate cap** — min 250 ms gap (≤ 4 notes/sec)

### Fallback

If fewer than 10 onsets are detected, `generateTempoBasedBeats()` kicks in:
- Estimates BPM from average inter-onset interval (default 120)
- Clamps to 40–240
- Generates quarter-note-spaced beats from first onset (or 0.5 s) to end of song

### Beatmap generation (`beatmap.js`)

- Round-robin across 4 lanes (0→1→2→3→0…)
- Min same-lane gap: 400 ms — notes that violate this are **skipped**
  (not moved to another lane)
- Console logs `onsets → notes` count plus skip count

## Data Flow

```
MP3 file → arrayBuffer → decodeAudioData → AudioBuffer
                                                ↓
                      getMonoSamples → detectOnsets → generateBeatmap
                              ↓                          ↓
                         onsets[]                  beatmap[]
                              ↓                          ↓
                     [returned from          [passed to Game
                      analyzeAudio]           component]
                                                     ↓
                                           state.notes (targetMs)
                                                     ↓
                                           rAF loop → drawFrame
```

## Scoring

- Perfect: ±50 ms → 100 base
- Good: ±120 ms → 50 base
- Miss: > 120 ms → 0 base, combo reset
- Combo multiplier: `1 + floor(combo / 10) × 0.5`
- Accuracy: `(perfect + good) / totalJudged` (shown in score panel)

## Song-End Flow

```
songTimeS > duration  ─┐
source.onended         ─┤→  songPhase = 'nameInput'
                          │
                          ├→  Enter name → Save Score
                          │        ↓
                          └→  songPhase = 'leaderboard'
                                   ↓
                              Top 10 list (current entry highlighted)
                                   ↓
                              Play Again → onRestart → back to upload
```

## Leaderboard

- Stored in `localStorage` key `'beatstrike_leaderboard'`
- Entries: `{ name, score, songTitle, date, accuracy, maxCombo,
  totalNotes, perfects, goods, misses }`
- Top 50 kept, top 10 displayed
- `isTopScore()` checks whether score qualifies before showing badge

## Code Style

- Functional components only, no class components
- Descriptive variable names: use `Ms` suffix for milliseconds,
  `S` suffix for seconds
- AudioContext must be resumed from `suspended` on user gesture
- `AudioBufferSourceNode` stopped in useEffect cleanup; guard
  `source.stop()` with try/catch
- Guard `songStartedRef` before `onended` sets `songPhase` —
  prevents React strict-mode double-mount from triggering end screen
