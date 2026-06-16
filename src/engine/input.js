// =============================================================================
// BeatStrike — Keyboard Input Manager
// =============================================================================
// Tracks key-down state for the 4 game lanes with a "consume on read" pattern
// so each keypress triggers at most one note hit.
// =============================================================================

import { LANES } from '../constants.js';

/**
 * Set up keyboard listeners for the D/F/J/K lane keys.
 *
 * Call `consumePress(laneIndex)` once per frame to check whether the key was
 * pressed *since the last consume*.  Returns `true` exactly once per physical
 * keypress (rising-edge).
 *
 * @returns {{ consumePress: (laneIdx: number) => boolean, teardown: () => void }}
 */
export function setupKeyboard() {
  /** @type {Set<number>} — lane indices with an unconsumed press */
  const pressed = new Set();

  /** @type {Map<string, number>} — key → lane index */
  const keyToLane = new Map(LANES.map((l, i) => [l.key, i]));

  function onKeyDown(e) {
    // Ignore repeats (holding a key down produces repeated keydown events)
    if (e.repeat) return;

    const lane = keyToLane.get(e.key.toLowerCase());
    if (lane !== undefined) {
      e.preventDefault();
      pressed.add(lane);
    }
  }

  window.addEventListener('keydown', onKeyDown);

  return {
    /**
     * Check whether the given lane was pressed.  Consumes the press so the
     * next call returns false (unless the key is pressed again).
     */
    consumePress(laneIndex) {
      if (pressed.has(laneIndex)) {
        pressed.delete(laneIndex);
        return true;
      }
      return false;
    },

    /** Remove the keyboard listener. */
    teardown() {
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
