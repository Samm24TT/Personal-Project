import { describe, it, expect, beforeEach } from 'vitest';
import { generateBeatmap, resetNoteIds, TRAVEL_S } from './beatmap.js';
import { LANE_COUNT, HIT_ZONE_Y, SCROLL_SPEED } from '../constants.js';

// Reset the note ID counter before each test so tests are independent.
beforeEach(() => {
  resetNoteIds();
});

// ---------------------------------------------------------------------------
// TRAVEL_S constant
// ---------------------------------------------------------------------------
describe('TRAVEL_S', () => {
  it('equals HIT_ZONE_Y / SCROLL_SPEED', () => {
    expect(TRAVEL_S).toBe(HIT_ZONE_Y / SCROLL_SPEED);
  });
});

// ---------------------------------------------------------------------------
// generateBeatmap — edge cases
// ---------------------------------------------------------------------------
describe('generateBeatmap — edge cases', () => {
  it('returns [] for null input', () => {
    expect(generateBeatmap(null)).toEqual([]);
  });

  it('returns [] for undefined input', () => {
    expect(generateBeatmap(undefined)).toEqual([]);
  });

  it('returns [] for empty array', () => {
    expect(generateBeatmap([])).toEqual([]);
  });

  it('returns a single note for a single onset', () => {
    const notes = generateBeatmap([1.0]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ id: 1, lane: 0, targetS: 1.0 });
  });
});

// ---------------------------------------------------------------------------
// generateBeatmap — lane assignment
// ---------------------------------------------------------------------------
describe('generateBeatmap — round-robin lane assignment', () => {
  it('distributes 4 onsets across lanes 0→1→2→3', () => {
    const onsets = [1.0, 1.5, 2.0, 2.5];
    const notes = generateBeatmap(onsets);

    expect(notes.map((n) => n.lane)).toEqual([0, 1, 2, 3]);
  });

  it('wraps back to lane 0 after lane 3', () => {
    // 5 onsets, well-spaced so none are skipped
    const onsets = [1.0, 1.5, 2.0, 2.5, 3.0];
    const notes = generateBeatmap(onsets);

    expect(notes[4].lane).toBe(0);
  });

  it('assigns lanes round-robin for 8 onsets', () => {
    const onsets = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
    const notes = generateBeatmap(onsets);

    expect(notes.map((n) => n.lane)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// generateBeatmap — same-lane gap enforcement
// ---------------------------------------------------------------------------
describe('generateBeatmap — same-lane gap enforcement', () => {
  it('skips a note that would land on the same lane within 0.40s', () => {
    // Lane 0 gets onset[0]=1.0 and onset[4]=1.3 (gap 0.3s < 0.4s → skip)
    // Onsets: 0→lane0, 1→lane1, 2→lane2, 3→lane3, 4→lane0 (skipped)
    const onsets = [1.0, 1.1, 1.2, 1.3, 1.35];
    const notes = generateBeatmap(onsets);

    // Only 4 notes should survive — the 5th is skipped (same lane as 1st, gap=0.35)
    expect(notes).toHaveLength(4);
  });

  it('keeps a note when same-lane gap is exactly 0.40s (strict <, not <=)', () => {
    // Lane 0: 1.0 and 1.41 → gap = 0.41 ≥ 0.40 → kept
    const onsets = [1.0, 1.1, 1.2, 1.3, 1.41];
    const notes = generateBeatmap(onsets);

    expect(notes).toHaveLength(5);
    expect(notes[4].lane).toBe(0);
  });

  it('skips a note when same-lane gap is just under 0.40s', () => {
    // Lane 0: 1.0 and 1.39 → gap = 0.39 → skipped
    const onsets = [1.0, 1.1, 1.2, 1.3, 1.39];
    const notes = generateBeatmap(onsets);

    expect(notes).toHaveLength(4);
  });

  it('skips multiple notes when onsets are very dense', () => {
    // 8 onsets within 0.5s — many will be skipped due to same-lane gaps
    const onsets = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35];
    const notes = generateBeatmap(onsets);

    // With round-robin and 0.4s gap, most get skipped
    expect(notes.length).toBeLessThan(onsets.length);
  });
});

// ---------------------------------------------------------------------------
// generateBeatmap — note IDs
// ---------------------------------------------------------------------------
describe('generateBeatmap — note IDs', () => {
  it('assigns sequential IDs starting from 1 after resetNoteIds', () => {
    const onsets = [1.0, 1.5, 2.0];
    const notes = generateBeatmap(onsets);

    expect(notes.map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it('continues IDs across multiple calls without reset', () => {
    generateBeatmap([1.0, 1.5]);
    const notes = generateBeatmap([3.0, 3.5]);

    expect(notes.map((n) => n.id)).toEqual([3, 4]);
  });

  it('resets IDs when resetNoteIds is called', () => {
    generateBeatmap([1.0, 1.5]);
    resetNoteIds();
    const notes = generateBeatmap([3.0, 3.5]);

    expect(notes.map((n) => n.id)).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// generateBeatmap — targetS preservation
// ---------------------------------------------------------------------------
describe('generateBeatmap — targetS', () => {
  it('preserves exact onset timestamps as targetS', () => {
    const onsets = [0.5, 1.234, 2.999, 4.0];
    const notes = generateBeatmap(onsets);

    expect(notes.map((n) => n.targetS)).toEqual(onsets);
  });
});
