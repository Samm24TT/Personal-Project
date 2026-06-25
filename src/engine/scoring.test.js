import { describe, it, expect } from 'vitest';
import { judgeHit, judgeMiss, FEEDBACK_COLORS } from './scoring.js';
import {
  PERFECT_WINDOW,
  GOOD_WINDOW,
  SCORE_PERFECT,
  SCORE_GOOD,
  SCORE_MISS,
} from '../constants.js';

// ---------------------------------------------------------------------------
// judgeHit
// ---------------------------------------------------------------------------
describe('judgeHit', () => {
  // --- result classification -----------------------------------------------

  it('returns "perfect" when timeDiffMs is 0 (exact hit)', () => {
    expect(judgeHit(0, 0).result).toBe('perfect');
  });

  it(`returns "perfect" at the boundary (timeDiffMs = ${PERFECT_WINDOW})`, () => {
    expect(judgeHit(PERFECT_WINDOW, 0).result).toBe('perfect');
  });

  it(`returns "good" just above perfect window (${PERFECT_WINDOW + 1})`, () => {
    expect(judgeHit(PERFECT_WINDOW + 1, 0).result).toBe('good');
  });

  it(`returns "good" at the boundary (timeDiffMs = ${GOOD_WINDOW})`, () => {
    expect(judgeHit(GOOD_WINDOW, 0).result).toBe('good');
  });

  it(`returns "miss" just above good window (${GOOD_WINDOW + 1})`, () => {
    expect(judgeHit(GOOD_WINDOW + 1, 0).result).toBe('miss');
  });

  it('returns "miss" for large time differences', () => {
    expect(judgeHit(9999, 0).result).toBe('miss');
  });

  // --- points ---------------------------------------------------------------

  it(`awards ${SCORE_PERFECT} base points for a perfect (combo 0 → multiplier 1)`, () => {
    const { points } = judgeHit(0, 0);
    expect(points).toBe(SCORE_PERFECT); // 100 * 1.0
  });

  it(`awards ${SCORE_GOOD} base points for a good (combo 0 → multiplier 1)`, () => {
    const { points } = judgeHit(PERFECT_WINDOW + 1, 0);
    expect(points).toBe(SCORE_GOOD); // 50 * 1.0
  });

  it('awards 0 points for a miss', () => {
    expect(judgeHit(GOOD_WINDOW + 1, 50).points).toBe(SCORE_MISS);
  });

  // --- combo ----------------------------------------------------------------

  it('increments combo on perfect', () => {
    expect(judgeHit(0, 4).combo).toBe(5);
  });

  it('increments combo on good', () => {
    expect(judgeHit(PERFECT_WINDOW + 1, 9).combo).toBe(10);
  });

  it('resets combo to 0 on miss', () => {
    expect(judgeHit(GOOD_WINDOW + 1, 99).combo).toBe(0);
  });

  // --- multiplier at combo boundaries --------------------------------------

  it('applies 1.5x multiplier at combo 10 (first milestone)', () => {
    // combo=9 → newCombo=10 → multiplier = 1 + floor(10/10)*0.5 = 1.5
    const { points, combo } = judgeHit(0, 9);
    expect(combo).toBe(10);
    expect(points).toBe(Math.round(SCORE_PERFECT * 1.5)); // 150
  });

  it('applies 2.0x multiplier at combo 20', () => {
    const { points, combo } = judgeHit(0, 19);
    expect(combo).toBe(20);
    expect(points).toBe(Math.round(SCORE_PERFECT * 2.0)); // 200
  });

  it('applies 6.0x multiplier at combo 100', () => {
    // combo=99 → newCombo=100 → multiplier = 1 + floor(100/10)*0.5 = 6.0
    const { points, combo } = judgeHit(0, 99);
    expect(combo).toBe(100);
    expect(points).toBe(Math.round(SCORE_PERFECT * 6.0)); // 600
  });

  // --- edge cases -----------------------------------------------------------

  it('handles negative timeDiffMs (early press) as perfect', () => {
    // abs() is not used — negative is ≤ PERFECT_WINDOW
    expect(judgeHit(-10, 0).result).toBe('perfect');
  });
});

// ---------------------------------------------------------------------------
// judgeMiss
// ---------------------------------------------------------------------------
describe('judgeMiss', () => {
  it('always returns result "miss"', () => {
    expect(judgeMiss(0).result).toBe('miss');
    expect(judgeMiss(100).result).toBe('miss');
  });

  it('always returns 0 points', () => {
    expect(judgeMiss(0).points).toBe(0);
    expect(judgeMiss(50).points).toBe(0);
  });

  it('always resets combo to 0, ignoring input combo', () => {
    expect(judgeMiss(0).combo).toBe(0);
    expect(judgeMiss(999).combo).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FEEDBACK_COLORS
// ---------------------------------------------------------------------------
describe('FEEDBACK_COLORS', () => {
  it('has colors for all three result types', () => {
    expect(FEEDBACK_COLORS).toHaveProperty('perfect');
    expect(FEEDBACK_COLORS).toHaveProperty('good');
    expect(FEEDBACK_COLORS).toHaveProperty('miss');
  });
});
