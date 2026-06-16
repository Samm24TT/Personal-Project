// =============================================================================
// BeatStrike — Beatmap Generator
// =============================================================================
// Converts an array of onset timestamps (seconds) into note objects suitable
// for the game engine.  Distributes notes across the 4 lanes and assigns each
// a target time for the player to hit.
// =============================================================================

import { LANE_COUNT, HIT_ZONE_Y, SCROLL_SPEED } from '../constants.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _noteId = 1;

/** Reset the note-id counter (call before generating a new beatmap). */
export function resetNoteIds() {
  _noteId = 1;
}

/**
 * Time in seconds a note needs to travel from the top of the canvas
 * to the hit zone.
 */
const TRAVEL_S = (HIT_ZONE_Y / SCROLL_SPEED);

/**
 * Minimum distance in seconds between consecutive notes on the *same* lane.
 * Prevents physically-impossible clusters (two notes on the same key at once).
 */
const MIN_SAME_LANE_GAP_S = 0.15;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a beatmap from onset timestamps.
 *
 * Notes are distributed round-robin across the 4 lanes (0→1→2→3→0…).
 * If placing a note on its assigned lane would violate MIN_SAME_LANE_GAP,
 * the note is skipped rather than moved — this keeps the lane rhythm clean.
 *
 * @param {number[]} onsets — onset times in seconds
 * @returns {Array<{ id: number, lane: number, targetS: number }>}
 */
export function generateBeatmap(onsets) {
  if (!onsets || onsets.length === 0) return [];

  // Track the last note time placed on each lane
  const lastOnLane = new Array(LANE_COUNT).fill(-Infinity);

  const notes = [];

  for (let i = 0; i < onsets.length; i++) {
    const onsetS = onsets[i];
    const lane = i % LANE_COUNT; // round-robin

    // Skip if this lane still has a recent note
    if (onsetS - lastOnLane[lane] < MIN_SAME_LANE_GAP_S) {
      continue;
    }

    notes.push({
      id:      _noteId++,
      lane,
      targetS: onsetS,                   // player must hit at this song time
    });

    lastOnLane[lane] = onsetS;
  }

  return notes;
}

export { TRAVEL_S };
