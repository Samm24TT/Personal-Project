// =============================================================================
// BeatStrike — Game Constants
// =============================================================================

// --- Canvas / Layout ----------------------------------------------------------
export const CANVAS_W = 480;
export const CANVAS_H = 720;

// --- Lanes --------------------------------------------------------------------
// Four lanes, each mapped to a keyboard key.
// Index 0 = leftmost lane, index 3 = rightmost lane.
export const LANES = [
  { key: 'd', label: 'D', color: '#ff6b6b' },   // Red
  { key: 'f', label: 'F', color: '#ffd93d' },   // Yellow
  { key: 'j', label: 'J', color: '#6bcb77' },   // Green
  { key: 'k', label: 'K', color: '#4d96ff' },   // Blue
];

export const LANE_COUNT = LANES.length;

// Lane geometry (computed from canvas width)
export const LANE_PADDING = 16;       // px on left/right of the lane area
export const LANE_GAP = 4;            // px between lanes
export const HIT_ZONE_Y = 620;        // y-position of the hit zone (px from top)
export const HIT_ZONE_HEIGHT = 12;    // thickness of the hit-zone bar
export const NOTE_RADIUS = 22;        // radius of a falling note circle
export const NOTE_W = 72;             // width of rounded-rect note
export const NOTE_H = 22;             // height of rounded-rect note
export const NOTE_R = 8;              // corner radius of rounded-rect note

// --- Timing Windows (ms) ------------------------------------------------------
export const PERFECT_WINDOW = 50;
export const GOOD_WINDOW = 120;
export const MISS_WINDOW = 180;       // note is auto-missed past this

// --- Scoring ------------------------------------------------------------------
export const SCORE_PERFECT = 100;
export const SCORE_GOOD = 50;
export const SCORE_MISS = 0;

// Combo thresholds — milestone combo counts that trigger visual feedback
export const COMBO_MILESTONES = [10, 25, 50, 100, 200];

// --- Countdown -----------------------------------------------------------------
// Seconds the countdown overlay is shown before audio + gameplay begin.
// Gives the player time to get ready and prevents early notes from being
// auto-missed before they scroll into view.
export const COUNTDOWN_S = 3;

// --- Note Speed ---------------------------------------------------------------
// Pixels per second the notes scroll down the screen.
export const SCROLL_SPEED = 400;

// --- Colours (dark theme) -----------------------------------------------------
export const COLORS = {
  bg:        '#0d0d14',
  laneBg:    '#14141f',
  laneLine:  '#1e1e30',
  hitZone:   'rgba(255, 255, 255, 0.25)',
  hitZoneGlow: 'rgba(255, 255, 255, 0.08)',
  text:      '#ffffff',
  textDim:   '#555566',
};
