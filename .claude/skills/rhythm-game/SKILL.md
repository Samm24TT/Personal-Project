# Rhythm Game Development Skill

## Project Context

BeatStrike is a 4-lane browser rhythm game built with React + Vite.
Players upload an MP3, beats are detected via Web Audio API, and notes
fall in sync with the music.

## Architecture Rules

- All game state lives in `useRef` — never `useState` for game loop data
- Game clock = `audioCtx.currentTime` — never frame-count based
- Keep rendering logic in `src/engine/renderer.js` only
- Keep beat detection logic in `src/engine/audioAnalyzer.js` only
- Keep scoring logic in `src/engine/scoring.js` only
- Constants go in `src/constants.js` — no magic numbers in components

## Canvas Rendering

- Always clear the full canvas each frame before drawing
- Draw order: background → lanes → notes → hit zone → HUD → feedback
- Use `requestAnimationFrame` inside `useEffect` with proper cleanup
- Cap delta time at 100ms to handle tab switching gracefully

## Beat Detection

- Frame size: 1024 samples, hop size: 512 (50% overlap)
- Threshold multiplier: 1.8x running mean
- Min inter-onset gap: 150ms globally
- Min same-lane gap: 400ms per lane
- Target density: 2-3 notes per second across all lanes

## Timing Windows

- Perfect: ±50ms
- Good: ±120ms
- Miss: anything beyond Good window

## Code Style

- Functional components only, no class components
- Descriptive variable names for timing values (use `Ms` suffix for milliseconds)
- Always handle AudioContext autoplay policy (resume on user interaction)
- Clean up AudioBufferSourceNode on component unmount
