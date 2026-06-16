// =============================================================================
// BeatStrike — Scoring & Hit Judgement
// =============================================================================

import {
  PERFECT_WINDOW,
  GOOD_WINDOW,
  SCORE_PERFECT,
  SCORE_GOOD,
  SCORE_MISS,
} from '../constants.js';

/**
 * Result of judging a note hit.
 * @typedef {{ result: 'perfect' | 'good' | 'miss', points: number, combo: number }} HitResult
 */

/**
 * Judge a player's keypress against a note.
 *
 * @param {number} timeDiffMs — absolute difference between current time and note.targetMs
 * @param {number} combo    — current combo count (before this hit)
 * @returns {HitResult}
 */
export function judgeHit(timeDiffMs, combo) {
  let result;
  let basePoints;

  if (timeDiffMs <= PERFECT_WINDOW) {
    result = 'perfect';
    basePoints = SCORE_PERFECT;
  } else if (timeDiffMs <= GOOD_WINDOW) {
    result = 'good';
    basePoints = SCORE_GOOD;
  } else {
    result = 'miss';
    basePoints = SCORE_MISS;
  }

  const newCombo = result === 'miss' ? 0 : combo + 1;
  const multiplier = 1 + Math.floor(newCombo / 10) * 0.5;
  const points = Math.round(basePoints * multiplier);

  return { result, points, combo: newCombo };
}

/**
 * Create a "miss" judgement (player didn't press, or note scrolled past).
 *
 * @param {number} combo — current combo
 * @returns {HitResult}
 */
export function judgeMiss(combo) {
  return {
    result: 'miss',
    points: SCORE_MISS,
    combo: 0,             // miss always breaks the combo
  };
}

/** Colour to use for feedback text. */
export const FEEDBACK_COLORS = {
  perfect: '#ffd93d',   // gold
  good:    '#ffffff',   // white
  miss:    '#ff6b6b',   // red
};
