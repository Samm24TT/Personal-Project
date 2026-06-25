// =============================================================================
// BeatStrike — Game Component
// =============================================================================
// Owns the <canvas>, runs the rAF loop, and drives gameplay from the audio
// clock so notes are perfectly synced with the music.
// =============================================================================

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  CANVAS_W,
  CANVAS_H,
  HIT_ZONE_Y,
  SCROLL_SPEED,
  LANE_COUNT,
  MISS_WINDOW,
  COUNTDOWN_S,
  NOTE_RADIUS,
} from '../constants.js';
import { drawFrame, drawCountdown } from '../engine/renderer.js';
import { setupKeyboard } from '../engine/input.js';
import { judgeHit, judgeMiss, FEEDBACK_COLORS } from '../engine/scoring.js';
import { TRAVEL_S } from '../engine/beatmap.js';
import { saveEntry, getTopN, isTopScore } from '../engine/leaderboard.js';
import './Game.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Milliseconds a note needs to travel from top of canvas to hit zone. */
const TRAVEL_MS = (HIT_ZONE_Y / SCROLL_SPEED) * 1000;

/** How long feedback text lives (ms). */
const FEEDBACK_DURATION_MS = 700;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   beatmap: Array<{ id: number, lane: number, targetS: number }>,
 *   audioBuffer: AudioBuffer,
 *   audioCtx: AudioContext,
 *   songTitle: string,
 *   onRestart: () => void,
 * }} props
 */
export default function Game({ beatmap, audioBuffer, audioCtx, songTitle, onRestart }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const inputRef = useRef(null);
  const sourceRef = useRef(null);           // AudioBufferSourceNode
  const startOffsetRef = useRef(0);         // audioCtx.currentTime when playback started
  const songStartedRef = useRef(false);     // true once countdown finishes & audio plays
  // 'playing' | 'nameInput' | 'leaderboard'
  const [songPhase, setSongPhase] = useState('playing');
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  // -------------------------------------------------------------------------
  // All mutable game state lives here to avoid React re-renders at 60fps.
  // -------------------------------------------------------------------------
  const stateRef = useRef({
    notes: [],              // all beatmap notes (pre-loaded)
    feedback: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    prevScore: 0,           // previous frame score (for delta animation)
    scoreDelta: 0,          // points just earned (for pop-up)
    scoreDeltaAge: 0,       // ms since scoreDelta appeared
    totalJudged: 0,         // total notes resolved (hit + auto-miss)
    totalPerfect: 0,
    totalGood: 0,
    laneFlashes: [0, 0, 0, 0],  // opacity per lane, decays each frame
    hitEffects: [],         // { lane, radius, opacity } — expanding rings
  });

  // -------------------------------------------------------------------------
  // Pre-load beatmap notes & start audio on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    const state = stateRef.current;

    // Convert beatmap targetS → ms and pre-load into state.notes.
    // Notes start inactive; they become active (visible) when they
    // enter the scroll window.
    state.notes = beatmap.map((n) => ({
      id:       n.id,
      lane:     n.lane,
      targetMs: n.targetS * 1000,
      active:   false,
      hit:      false,
      y:        0,
    }));

    state.feedback = [];
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.prevScore = 0;
    state.scoreDelta = 0;
    state.scoreDeltaAge = 0;
    state.totalJudged = 0;
    state.totalPerfect = 0;
    state.totalGood = 0;
    state.laneFlashes = [0, 0, 0, 0];
    state.hitEffects = [];
    setSongPhase('playing');
    setPlayerName('');
    setLeaderboard([]);
    songStartedRef.current = false;

    // Resume AudioContext (required by browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Schedule audio to start after the countdown.
    // The song clock (songTimeS) will be negative during the countdown and
    // reach 0 exactly when audio playback begins — keeping notes perfectly
    // synced with the music.
    const startAt = audioCtx.currentTime + COUNTDOWN_S;

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(startAt);
    sourceRef.current = source;

    // Record the audio-clock time when playback *will* start.
    // songTimeS = audioCtx.currentTime - startOffsetRef.current
    //          → negative during countdown, 0 when audio begins
    startOffsetRef.current = startAt;

    // Detect song end — only fire if playback actually started.
    // Guards against premature onended from source.stop() during React
    // strict-mode cleanup (which fires before the countdown finishes).
    source.onended = () => {
      if (songStartedRef.current) {
        // Tear down gameplay keyboard listener so D/F/J/K can be typed
        // into the name input field.
        if (inputRef.current) {
          inputRef.current.teardown();
          inputRef.current = null;
        }
        setSongPhase('nameInput');
      }
    };

    return () => {
      // Stop playback on unmount
      try { source.stop(); } catch (_) { /* already stopped */ }
    };
  }, [beatmap, audioBuffer, audioCtx]);

  // -------------------------------------------------------------------------
  // Game Loop
  // -------------------------------------------------------------------------
  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;
    const input = inputRef.current;

    // --- Clock ---
    // Drive from the audio clock so notes stay in perfect sync even if
    // the rAF cadence drifts.
    // songTimeS is negative during the countdown and reaches 0 when audio starts.
    const songTimeS = audioCtx.currentTime - startOffsetRef.current;
    const currentTimeMs = songTimeS * 1000;

    // --- Countdown phase (songTimeS < 0) ---
    if (songTimeS < 0) {
      // Drain any keypresses that happened during countdown so they don't
      // register as hits the moment gameplay begins.
      if (input) {
        for (let lane = 0; lane < LANE_COUNT; lane++) {
          input.consumePress(lane);
        }
      }

      const ctx = canvas.getContext('2d');
      drawCountdown(ctx, songTimeS);

      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    // --- Song active (songTimeS >= 0) ---
    // Mark that playback has truly started so onended is allowed to fire.
    songStartedRef.current = true;

    // Primary song-end check: audio has played past the buffer duration.
    // The source.onended callback is a fallback in case the rAF loop stalls.
    if (songTimeS > audioBuffer.duration) {
      if (inputRef.current) {
        inputRef.current.teardown();
        inputRef.current = null;
      }
      setSongPhase('nameInput');
      return;
    }

    // --- Activate notes that are now on screen ---
    // Only runs once songTimeS >= 0 (audio is playing).
    for (const note of state.notes) {
      if (note.hit) continue;   // already resolved

      // A note becomes visible when its arrival is within TRAVEL_MS
      const visible = currentTimeMs > note.targetMs - TRAVEL_MS;

      if (visible && !note.active) {
        note.active = true;
      }
      if (note.active) {
        // Derive y from timing
        note.y = HIT_ZONE_Y - (SCROLL_SPEED * (note.targetMs - currentTimeMs)) / 1000;
      }

      // Auto-miss: note scrolled well past the hit zone
      if (note.active && !note.hit && currentTimeMs > note.targetMs + MISS_WINDOW) {
        note.hit = true;
        note.active = false;
        const result = judgeMiss(state.combo);
        state.combo = result.combo;
        state.score += result.points;
        state.totalJudged++;
        state.feedback.push({
          text:    'MISS',
          lane:    note.lane,
          y:       HIT_ZONE_Y,
          opacity: 1,
          color:   FEEDBACK_COLORS.miss,
        });
      }
    }

    // --- Process input ---
    if (input) {
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        if (!input.consumePress(lane)) continue;

        // Flash the lane on every keypress (even if no note is there)
        state.laneFlashes[lane] = 1;

        // Find the closest un-hit note in this lane
        let closest = null;
        let closestDiff = Infinity;
        for (const note of state.notes) {
          if (!note.active || note.hit || note.lane !== lane) continue;
          const diff = Math.abs(currentTimeMs - note.targetMs);
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
          state.totalJudged++;

          if (result === 'perfect') state.totalPerfect++;
          if (result === 'good') state.totalGood++;
          if (combo > state.maxCombo) state.maxCombo = combo;

          if (result !== 'miss') {
            // Hit effect ring
            state.hitEffects.push({
              lane,
              radius: NOTE_RADIUS * 0.6,
              opacity: 0.9,
            });

            state.feedback.push({
              text:    result.toUpperCase(),
              lane,
              y:       HIT_ZONE_Y - 20,
              opacity: 1,
              color:   FEEDBACK_COLORS[result],
            });
          }
        }
      }
    }

    // --- Cull stale notes ---
    state.notes = state.notes.filter((n) => !n.hit || n.active);

    // --- Score delta (for pop-up animation) ---
    const FRAME_MS = 16;
    if (state.score !== state.prevScore) {
      state.scoreDelta = state.score - state.prevScore;
      state.scoreDeltaAge = 0;
      state.prevScore = state.score;
    } else {
      state.scoreDeltaAge += FRAME_MS;
    }

    // --- Age lane flashes ---
    const FLASH_DECAY = 0.12; // opacity lost per frame
    for (let i = 0; i < LANE_COUNT; i++) {
      state.laneFlashes[i] = Math.max(0, state.laneFlashes[i] - FLASH_DECAY);
    }

    // --- Age hit effects ---
    for (const fx of state.hitEffects) {
      fx.radius += 2.5;          // expand outward
      fx.opacity -= 0.035;       // fade out
    }
    state.hitEffects = state.hitEffects.filter((fx) => fx.opacity > 0);

    // --- Age feedback ---
    for (const fb of state.feedback) {
      fb.opacity -= FRAME_MS / FEEDBACK_DURATION_MS;
      fb.y -= FRAME_MS * 0.04;
    }
    state.feedback = state.feedback.filter((fb) => fb.opacity > 0);

    // --- Draw ---
    const ctx = canvas.getContext('2d');
    const accuracy = state.totalJudged > 0
      ? (state.totalPerfect + state.totalGood) / state.totalJudged
      : 0;
    drawFrame(ctx, {
      notes:      state.notes,
      feedback:   state.feedback,
      score:      state.score,
      combo:      state.combo,
      scoreDelta: state.scoreDelta,
      scoreDeltaAge: state.scoreDeltaAge,
      accuracy,
      laneFlashes: state.laneFlashes,
      hitEffects: state.hitEffects,
      songTitle,
      songTimeS,
      duration: audioBuffer.duration,
    });

    rafRef.current = requestAnimationFrame(loop);
  }, [audioCtx, audioBuffer, songTitle]);

  // -------------------------------------------------------------------------
  // Leaderboard handlers
  // -------------------------------------------------------------------------
  const handleSubmitName = useCallback(() => {
    const state = stateRef.current;
    const name = playerName.trim() || 'Anonymous';
    const accuracy = state.totalJudged > 0
      ? (state.totalPerfect + state.totalGood) / state.totalJudged
      : 0;

    saveEntry({
      name,
      score: state.score,
      songTitle: songTitle || 'Unknown',
      date: new Date().toISOString(),
      accuracy,
      maxCombo: state.maxCombo,
      totalNotes: state.totalJudged,
      perfects: state.totalPerfect,
      goods: state.totalGood,
      misses: state.totalJudged - state.totalPerfect - state.totalGood,
    });

    setLeaderboard(getTopN(10));
    setSongPhase('leaderboard');
  }, [playerName, songTitle]);

  const handlePlayAgain = useCallback(() => {
    onRestart();
  }, [onRestart]);

  // -------------------------------------------------------------------------
  // Mount / Unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    inputRef.current = setupKeyboard();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (inputRef.current) {
        inputRef.current.teardown();
        inputRef.current = null;
      }
    };
  }, [loop]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const finalScore = stateRef.current.score;
  const finalState = stateRef.current;
  const finalAccuracy = finalState.totalJudged > 0
    ? Math.round(((finalState.totalPerfect + finalState.totalGood) / finalState.totalJudged) * 100)
    : 0;
  const finalsMisses = finalState.totalJudged - finalState.totalPerfect - finalState.totalGood;

  return (
    <div className="game-wrapper">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_W}
        height={CANVAS_H}
      />

      {/* Name-entry overlay */}
      {songPhase === 'nameInput' && (
        <div className="song-done-overlay">
          <p className="song-done-score">{finalScore.toLocaleString()}</p>
          <p className="song-done-label">Final Score</p>

          <div className="song-done-stats">
            <span>{finalState.maxCombo}x max combo</span>
            <span>{finalAccuracy}% accuracy</span>
          </div>

          {isTopScore(finalScore) && (
            <p className="leaderboard-rank-new">🏆 Top 10 score!</p>
          )}

          <input
            className="name-input"
            type="text"
            maxLength={20}
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitName(); }}
            autoFocus
          />

          <button className="song-done-btn" onClick={handleSubmitName}>
            Save Score
          </button>
        </div>
      )}

      {/* Leaderboard overlay */}
      {songPhase === 'leaderboard' && (
        <div className="song-done-overlay">
          <p className="leaderboard-title">🏆 Leaderboard</p>

          <div className="leaderboard-list">
            {leaderboard.map((entry, i) => {
              const isCurrent = (
                entry.score === finalState.score &&
                entry.songTitle === (songTitle || 'Unknown') &&
                entry.maxCombo === finalState.maxCombo
              );
              return (
                <div
                  key={i}
                  className={`leaderboard-row${isCurrent ? ' leaderboard-row--current' : ''}`}
                >
                  <span className="leaderboard-rank">#{i + 1}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-score">{entry.score.toLocaleString()}</span>
                  <span className="leaderboard-acc">{Math.round(entry.accuracy * 100)}%</span>
                </div>
              );
            })}
            {leaderboard.length === 0 && (
              <p className="leaderboard-empty">No scores yet</p>
            )}
          </div>

          <button className="song-done-btn" onClick={handlePlayAgain}>
            Play Again
          </button>
        </div>
      )}

      {/* Keyboard hint — only during gameplay */}
      {songPhase === 'playing' && (
        <p className="game-hint">
          Press <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> to play
        </p>
      )}
    </div>
  );
}
