// =============================================================================
// BeatStrike — Canvas Renderer
// =============================================================================
// Pure drawing functions.  No game state lives here — the caller passes in
// everything the renderer needs to draw a frame.
// =============================================================================

import {
  CANVAS_W,
  CANVAS_H,
  LANES,
  LANE_PADDING,
  LANE_GAP,
  HIT_ZONE_Y,
  HIT_ZONE_HEIGHT,
  NOTE_RADIUS,
  COLORS,
} from '../constants.js';

// --- Helpers ------------------------------------------------------------------

/** Return the x-centre of a lane (0-indexed). */
export function laneCentreX(laneIndex) {
  const usableWidth = CANVAS_W - LANE_PADDING * 2 - LANE_GAP * (LANES.length - 1);
  const laneWidth = usableWidth / LANES.length;
  return LANE_PADDING + laneWidth * laneIndex + laneWidth / 2 + LANE_GAP * laneIndex;
}

// --- Background & Lanes -------------------------------------------------------

/**
 * Fill the background and draw the 4 vertical lanes plus subtle dividers.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawLanes(ctx) {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const usableWidth = CANVAS_W - LANE_PADDING * 2 - LANE_GAP * (LANES.length - 1);
  const laneWidth = usableWidth / LANES.length;

  for (let i = 0; i < LANES.length; i++) {
    const x = LANE_PADDING + i * (laneWidth + LANE_GAP);

    // Lane background (subtle lighter strip)
    ctx.fillStyle = COLORS.laneBg;
    ctx.fillRect(x, 0, laneWidth, CANVAS_H);

    // Lane divider lines (left edge of each lane)
    ctx.strokeStyle = COLORS.laneLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }

  // Right-edge divider
  const rightX = LANE_PADDING + LANES.length * laneWidth + (LANES.length - 1) * LANE_GAP;
  ctx.strokeStyle = COLORS.laneLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX, 0);
  ctx.lineTo(rightX, CANVAS_H);
  ctx.stroke();
}

// --- Hit Zone ----------------------------------------------------------------

/**
 * Draw the hit-zone bar and its glow near the bottom of the screen.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawHitZone(ctx) {
  const barY = HIT_ZONE_Y;

  // Outer glow
  const glowGrad = ctx.createLinearGradient(0, barY - 20, 0, barY + HIT_ZONE_HEIGHT + 20);
  glowGrad.addColorStop(0, 'transparent');
  glowGrad.addColorStop(0.5, COLORS.hitZoneGlow);
  glowGrad.addColorStop(1, 'transparent');

  ctx.fillStyle = glowGrad;
  ctx.fillRect(LANE_PADDING, barY - 20, CANVAS_W - LANE_PADDING * 2, HIT_ZONE_HEIGHT + 40);

  // Solid bar
  ctx.fillStyle = COLORS.hitZone;
  ctx.fillRect(LANE_PADDING, barY, CANVAS_W - LANE_PADDING * 2, HIT_ZONE_HEIGHT);
}

// --- Lane Labels -------------------------------------------------------------

/**
 * Draw the key labels at the top of each lane.
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawLaneLabels(ctx) {
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < LANES.length; i++) {
    const cx = laneCentreX(i);
    const y = 40;

    // Subtle circle behind label
    ctx.fillStyle = LANES[i].color + '22';   // low-opacity tint
    ctx.beginPath();
    ctx.arc(cx, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Key label
    ctx.fillStyle = LANES[i].color;
    ctx.fillText(LANES[i].label, cx, y);
  }
}

// --- Notes -------------------------------------------------------------------

/**
 * Draw a single note.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ lane: number, y: number, active: boolean, hitResult?: string }} note
 */
export function drawNote(ctx, note) {
  const cx = laneCentreX(note.lane);
  const color = LANES[note.lane].color;

  // Glow
  const glowGrad = ctx.createRadialGradient(cx, note.y, NOTE_RADIUS * 0.3, cx, note.y, NOTE_RADIUS * 1.6);
  glowGrad.addColorStop(0, color + '66');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, note.y, NOTE_RADIUS * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Main circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, note.y, NOTE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx - NOTE_RADIUS * 0.25, note.y - NOTE_RADIUS * 0.25, NOTE_RADIUS * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw all active notes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ lane: number, y: number, active: boolean }>} notes
 */
export function drawNotes(ctx, notes) {
  for (const note of notes) {
    if (note.active) {
      drawNote(ctx, note);
    }
  }
}

// --- Frame Composer ----------------------------------------------------------

/**
 * Draw one complete frame.  Call this from the rAF loop.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ notes: Array, combo: number, score: number }} state
 */
export function drawFrame(ctx, state) {
  ctx.save();

  drawLanes(ctx);
  drawHitZone(ctx);
  drawLaneLabels(ctx);

  if (state.notes && state.notes.length > 0) {
    drawNotes(ctx, state.notes);
  }

  // Score / combo HUD (top-right)
  ctx.font = '16px system-ui, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`SCORE  ${String(state.score ?? 0).padStart(8, '0')}`, CANVAS_W - 24, 16);

  if (state.combo > 1) {
    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`${state.combo}x COMBO`, CANVAS_W - 24, 40);
  }

  ctx.restore();
}
