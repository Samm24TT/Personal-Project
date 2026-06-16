// =============================================================================
// BeatStrike — Game Component
// =============================================================================
// Owns the <canvas>, runs the requestAnimationFrame loop, and delegates
// drawing to the renderer.  This is the heart of the game.
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import {
  CANVAS_W,
  CANVAS_H,
  COLORS,
} from '../constants.js';
import { drawFrame } from '../engine/renderer.js';
import './Game.css';

export default function Game() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const stateRef = useRef({
    notes: [],
    score: 0,
    combo: 0,
  });

  // --- Game Loop ------------------------------------------------------------
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    drawFrame(ctx, stateRef.current);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // --- Mount / Unmount ------------------------------------------------------
  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
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
