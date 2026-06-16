// =============================================================================
// BeatStrike — Game Component
// =============================================================================
// Owns the <canvas>, runs the requestAnimationFrame loop, and wires together
// keyboard input, note spawning, scoring, and rendering.
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import {
  CANVAS_W,
  CANVAS_H,
  HIT_ZONE_Y,
  MISS_WINDOW,
  SCROLL_SPEED,
  LANE_COUNT,
} from '../constants.js';
import { drawFrame } from '../engine/renderer.js';
import { setupKeyboard } from '../engine/input.js';
import { judgeHit, judgeMiss, FEEDBACK_COLORS } from '../engine/scoring.js';
import './Game.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _noteId = 0;
function nextNoteId() {
  return ++_noteId;
}

/** Time (ms) for a note to travel the full canvas height. */
const TRAVEL_MS = (CANVAS_H / SCROLL_SPEED) * 1000;

/** Spawn interval for test notes. */
const SPAWN_INTERVAL_MS = 1000;

/** How long feedback text lives (ms). */
const FEEDBACK_DURATION_MS = 700;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Game() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const inputRef = useRef(null);
  const lastFrameRef = useRef(0);

  // All mutable game state lives here to avoid React re-renders at 60fps.
  const stateRef = useRef({
    notes: [],
    feedback: [],
    score: 0,
    combo: 0,
    currentTimeMs: 0,
    lastSpawnMs: -SPAWN_INTERVAL_MS,   // spawn one immediately
  });

  // --- Game Loop ------------------------------------------------------------
  const loop = useCallback((timestampMs) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- Delta time ---------------------------------------------------------
    if (lastFrameRef.current === 0) {
      lastFrameRef.current = timestampMs;
    }
    let deltaMs = timestampMs - lastFrameRef.current;
    lastFrameRef.current = timestampMs;

    // Clamp delta to avoid huge jumps when the tab loses focus.
    if (deltaMs > 100) deltaMs = 100;

    const state = stateRef.current;
    state.currentTimeMs += deltaMs;

    const input = inputRef.current;

    // --- Spawn test notes ---------------------------------------------------
    if (state.currentTimeMs - state.lastSpawnMs >= SPAWN_INTERVAL_MS) {
      state.lastSpawnMs = state.currentTimeMs;
      const lane = Math.floor(Math.random() * LANE_COUNT);
      state.notes.push({
        id:       nextNoteId(),
        lane,
        targetMs: state.currentTimeMs + TRAVEL_MS,
        active:   true,
        hit:      false,
      });
    }

    // --- Update note Y positions & auto-miss --------------------------------
    for (const note of state.notes) {
      if (!note.active) continue;

      // Derive y from timing
      note.y = HIT_ZONE_Y - (SCROLL_SPEED * (note.targetMs - state.currentTimeMs)) / 1000;

      // Auto-miss: note scrolled well past the hit zone
      if (!note.hit && state.currentTimeMs > note.targetMs + MISS_WINDOW) {
        note.hit = true;
        note.active = false;
        const result = judgeMiss(state.combo);
        state.combo = result.combo;
        state.score += result.points;
        state.feedback.push({
          text:    'MISS',
          lane:    note.lane,
          y:       HIT_ZONE_Y,
          opacity: 1,
          color:   FEEDBACK_COLORS.miss,
        });
      }
    }

    // --- Process input ------------------------------------------------------
    if (input) {
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        if (!input.consumePress(lane)) continue;

        // Find the closest un-hit note in this lane
        let closest = null;
        let closestDiff = Infinity;
        for (const note of state.notes) {
          if (!note.active || note.hit || note.lane !== lane) continue;
          const diff = Math.abs(state.currentTimeMs - note.targetMs);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = note;
          }
        }

        if (closest) {
          const { result, points, combo } = judgeHit(closestDiff, state.combo);
          closest.hit = true;
          closest.active = false;
          state.combo = combo;
          state.score += points;

          if (result !== 'miss') {
            state.feedback.push({
              text:    result.toUpperCase(),
              lane,
              y:       HIT_ZONE_Y - 20,
              opacity: 1,
              color:   FEEDBACK_COLORS[result],
            });
          }
        }
        // Note: pressing on an empty lane does nothing (no penalty)
      }
    }

    // --- Cull stale notes ---------------------------------------------------
    state.notes = state.notes.filter((n) => n.active);

    // --- Age feedback -------------------------------------------------------
    for (const fb of state.feedback) {
      fb.opacity -= deltaMs / FEEDBACK_DURATION_MS;
      fb.y -= deltaMs * 0.04;   // float upward
    }
    // Remove fully-faded items
    state.feedback = state.feedback.filter((fb) => fb.opacity > 0);

    // --- Draw ---------------------------------------------------------------
    const ctx = canvas.getContext('2d');
    drawFrame(ctx, state);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // --- Mount / Unmount ------------------------------------------------------
  useEffect(() => {
    inputRef.current = setupKeyboard();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (inputRef.current) {
        inputRef.current.teardown();
      }
    };
  }, [loop]);

  // --- Render ---------------------------------------------------------------
  return (
    <div className="game-wrapper">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_W}
        height={CANVAS_H}
      />
      <p className="game-hint">
        Press <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> to play
      </p>
    </div>
  );
}
