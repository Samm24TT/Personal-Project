# Beatmap Generator Agent

## Role

Specialist agent for the beat detection and beatmap generation pipeline in
BeatStrike.  Converts raw audio into playable note sequences at exactly the
right density for a fun, fair experience.

## Scope

- **`src/engine/audioAnalyzer.js`** — 7-stage onset detection pipeline,
  threshold tuning, BPM fallback
- **`src/engine/beatmap.js`** — round-robin lane distribution, same-lane
  gap enforcement, note ID generation
- **`src/constants.js`** — timing windows, note density, lane geometry
  (only the constants that affect beat detection / difficulty)

Do **not** touch: `renderer.js`, `scoring.js`, `input.js`, `Game.jsx`,
`leaderboard.js`, CSS files, or React components — unless the task
explicitly requires threading a new data field through to the game loop.

## Rules (never violate)

### Hard caps
- Global note density ≤ 4 notes/sec (enforced by 250 ms global gap cap)
- Minimum same-lane gap ≥ 300 ms (keeps individual lanes humanly playable)
- Threshold multiplier between 1.2 and 2.2 — lower catches more transients,
  higher filters noise. Default is 1.8.

### When tuning
- Target 2–3 notes per second across all lanes after the full pipeline
  (detection → strength filter → rate cap → beatmap distribution)
- If you raise the threshold multiplier, consider lowering the min gap,
  and vice versa — the tuning controls interact
- Always console-log onset count and final note count so the player
  can see what happened in DevTools
- The BPM fallback (`generateTempoBasedBeats`) must remain in place
  for songs where detection finds < 10 onsets

### Note distribution
- Round-robin lane assignment preserves the original onset order
- Notes that violate the same-lane gap are **skipped**, not moved —
  this keeps the rhythm clean across lanes
- `resetNoteIds()` must be called before each `generateBeatmap()` call

## Pipeline Reminder

```
samples → RMS energy → spectral flux → adaptive threshold (×1.8)
  → peak pick (150ms gap, returning {frameIdx, fluxValue})
  → keep top 40% by flux
  → convert frameIdx to seconds: (frameIdx × hopSize) / sampleRate
  → sort by time
  → enforce 250ms global gap
  → return onsets[]
```

The frame→seconds conversion is **critical**. Frame index `i` starts at
PCM sample `i × hopSize`, so the timestamp is `(i × hopSize) / sampleRate`,
**not** `i / sampleRate`.

## Key Constants Reference

| Constant | Value | Where |
|---|---|---|
| Frame size | 1024 samples | `audioAnalyzer.js` |
| Hop size | 512 samples | `audioAnalyzer.js` |
| Threshold multiplier | 1.8 | `audioAnalyzer.js` |
| Min inter-onset gap (global) | 150 ms | `audioAnalyzer.js` |
| Min global rate cap | 250 ms (≤4/sec) | `audioAnalyzer.js` |
| Min same-lane gap | 400 ms | `beatmap.js` |
| Fallback min onsets | 10 | `audioAnalyzer.js` |
| Score panel dimensions | PANEL_X/Y/W/H/R | `constants.js` |

## Debugging Checklist

Before claiming a fix works:
- Song with clear 4/4 beat (pop/EDM): should produce 2–3 notes/sec,
  onsets correctly spread across full duration (not clustered in first
  second)
- Song with complex rhythm (jazz/ambient): BPM fallback should fire,
  producing a steady playable stream
- Very quiet song: adaptive threshold should still find *some* onsets,
  or fallback should handle it
- Very loud/dense song (metal/dubstep): should not flood lanes —
  strength filter + rate cap must keep it ≤ 4 notes/sec
- Check DevTools console for: `[audioAnalyzer]` onset count +
  `[beatmap]` onset→note ratio
