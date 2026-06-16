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
  NOTE_W,
  NOTE_H,
  NOTE_R,
  COLORS,
} from '../constants.js';

// --- Helpers ------------------------------------------------------------------

/** Return the x-centre of a lane (0-indexed). */
export function laneCentreX(laneIndex) {
  const usableWidth = CANVAS_W - LANE_PADDING * 2 - LANE_GAP * (LANES.length - 1);
  const laneWidth = usableWidth / LANES.length;
  return LANE_PADDING + laneWidth * laneIndex + laneWidth / 2 + LANE_GAP * laneIndex;
}

/** Convert a #RRGGBB hex colour to an rgba() string. */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// --- Background & Lanes -------------------------------------------------------

/**
 * Fill the background and draw the 4 vertical lanes plus subtle dividers.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} [laneFlashes] — opacity per lane for key-press flash
 */
export function drawLanes(ctx, laneFlashes) {
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

    // Lane flash overlay — brightens when key is pressed
    if (laneFlashes && laneFlashes[i] > 0.01) {
      const alpha = laneFlashes[i] * 0.20;
      ctx.fillStyle = hexToRgba(LANES[i].color, alpha);
      ctx.fillRect(x, 0, laneWidth, CANVAS_H);
    }

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
 * @param {Array<{ lane: number, radius: number, opacity: number }>} [hitEffects]
 */
export function drawHitZone(ctx, hitEffects) {
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

  // Hit effect rings — expanding coloured rings at the hit zone
  if (hitEffects) {
    for (const fx of hitEffects) {
      if (fx.opacity <= 0) continue;
      const cx = laneCentreX(fx.lane);
      const cy = barY + HIT_ZONE_HEIGHT / 2;

      ctx.save();
      ctx.globalAlpha = fx.opacity;
      ctx.strokeStyle = LANES[fx.lane].color;
      ctx.lineWidth = 3;
      ctx.shadowColor = LANES[fx.lane].color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, fx.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Second thinner ring
      ctx.lineWidth = 1;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, fx.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }
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
 * Draw a single note as a rounded rectangle with a coloured glow.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ lane: number, y: number, active: boolean }} note
 */
export function drawNote(ctx, note) {
  const cx = laneCentreX(note.lane);
  const color = LANES[note.lane].color;
  const x = cx - NOTE_W / 2;
  const y = note.y - NOTE_H / 2;

  // Outer glow (larger rounded rect behind the note)
  const glowPad = 8;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = hexToRgba(color, 0.45);
  ctx.beginPath();
  ctx.roundRect(x - glowPad, y - glowPad, NOTE_W + glowPad * 2, NOTE_H + glowPad * 2, NOTE_R + 2);
  ctx.fill();
  ctx.restore();

  // Main body — gradient from lighter to base colour
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + NOTE_H);
  bodyGrad.addColorStop(0, hexToRgba(color, 0.95));
  bodyGrad.addColorStop(1, hexToRgba(color, 0.7));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, NOTE_W, NOTE_H, NOTE_R);
  ctx.fill();

  // Border
  ctx.strokeStyle = hexToRgba('#ffffff', 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, NOTE_W, NOTE_H, NOTE_R);
  ctx.stroke();

  // Inner highlight stripe (top third, bright)
  const hiGrad = ctx.createLinearGradient(x, y, x, y + NOTE_H * 0.5);
  hiGrad.addColorStop(0, 'rgba(255,255,255,0.30)');
  hiGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = hiGrad;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 1, NOTE_W - 4, NOTE_H * 0.5, NOTE_R);
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

// --- Feedback Text -----------------------------------------------------------

/**
 * Draw hit-feedback text (Perfect / Good / Miss) that fades and floats upward.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ text: string, lane: number, y: number, opacity: number, color: string }>} feedbackItems
 */
export function drawFeedback(ctx, feedbackItems) {
  for (const fb of feedbackItems) {
    ctx.globalAlpha = fb.opacity;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fb.color;

    // Subtle text shadow for pop
    ctx.shadowColor = fb.color;
    ctx.shadowBlur = 8;

    ctx.fillText(fb.text, laneCentreX(fb.lane), fb.y);

    // Reset
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// --- Progress Bar -----------------------------------------------------------

/**
 * Draw a thin song-progress bar at the bottom of the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} songTimeS  — elapsed song time in seconds
 * @param {number} durationS  — total song duration in seconds
 */
export function drawProgressBar(ctx, songTimeS, durationS) {
  if (!durationS || durationS <= 0) return;

  const barH = 3;
  const barY = CANVAS_H - 20;
  const barX = LANE_PADDING;
  const barW = CANVAS_W - LANE_PADDING * 2;
  const progress = Math.min(songTimeS / durationS, 1);

  // Track background
  ctx.fillStyle = COLORS.laneLine;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 2);
  ctx.fill();

  // Filled portion with lane-coloured gradient
  if (progress > 0) {
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fillGrad.addColorStop(0, LANES[0].color);
    fillGrad.addColorStop(0.33, LANES[1].color);
    fillGrad.addColorStop(0.66, LANES[2].color);
    fillGrad.addColorStop(1, LANES[3].color);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progress, barH, 2);
    ctx.fill();
  }

  // Elapsed / total time labels
  ctx.font = '10px system-ui, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = COLORS.textDim;
  const elapsed = formatTime(songTimeS);
  ctx.fillText(elapsed, barX, barY - 6);

  ctx.textAlign = 'right';
  const total = formatTime(durationS);
  ctx.fillText(total, barX + barW, barY - 6);
}

/** Format seconds as M:SS. */
function formatTime(s) {
  if (s < 0) s = 0;
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// --- Song Title -------------------------------------------------------------

/**
 * Draw the uploaded song filename at the top of the screen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} title
 */
export function drawSongTitle(ctx, title) {
  if (!title) return;

  // Trim file extension for display
  const display = title.replace(/\.(mp3|wav|ogg|flac|aac|m4a)$/i, '');

  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textDim;

  // Truncate if too long
  const maxW = CANVAS_W - LANE_PADDING * 2 - 80;
  const metrics = ctx.measureText(display);
  const text = metrics.width > maxW
    ? display.slice(0, Math.floor(display.length * maxW / metrics.width) - 1) + '…'
    : display;

  ctx.fillText(text, CANVAS_W / 2, 76);
}

// --- Combo Display ----------------------------------------------------------

/**
 * Draw a large prominent combo counter above the hit zone.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} combo
 */
export function drawCombo(ctx, combo) {
  if (combo < 2) return;

  const cx = CANVAS_W / 2;
  const y = HIT_ZONE_Y - 72;

  // Combo colour escalates at milestones
  let color;
  if (combo >= 100) color = '#ffd93d';   // gold
  else if (combo >= 50) color = '#ff6b6b'; // hot red
  else if (combo >= 25) color = '#4d96ff'; // blue
  else color = '#ffffff';

  // Pulsing glow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 + (combo % 10) * 2;

  // "COMBO" label
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.fillText('COMBO', cx, y - 4);

  // Number
  ctx.font = `bold ${Math.min(48, 28 + combo * 0.3)}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 1;
  ctx.fillText(String(combo), cx, y);

  ctx.restore();
}

// --- Score Display ----------------------------------------------------------

/**
 * Draw the score in the top-right with an animated pop-up for recently-earned points.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} score
 * @param {number} scoreDelta   — points just earned (0 = none to show)
 * @param {number} deltaAgeMs   — how long since the delta appeared
 */
export function drawScore(ctx, score, scoreDelta, deltaAgeMs) {
  // Main score (top-right)
  ctx.font = '16px system-ui, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`SCORE  ${String(score).padStart(8, '0')}`, CANVAS_W - 24, 16);

  // Animated delta pop-up
  const DELTA_DURATION = 800;
  if (scoreDelta > 0 && deltaAgeMs < DELTA_DURATION) {
    const t = deltaAgeMs / DELTA_DURATION; // 0 → 1
    const alpha = 1 - t;
    const offsetY = -20 - t * 40; // float upward

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px system-ui, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 8;
    ctx.fillText(`+${scoreDelta}`, CANVAS_W - 24, 16 + offsetY);
    ctx.restore();
  }
}

// --- Frame Composer ----------------------------------------------------------

/**
 * Draw one complete frame.  Call this from the rAF loop.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   notes: Array,
 *   feedback: Array,
 *   combo: number,
 *   score: number,
 *   scoreDelta: number,
 *   scoreDeltaAge: number,
 *   laneFlashes: number[],
 *   hitEffects: Array,
 *   songTitle: string,
 *   songTimeS: number,
 *   duration: number,
 * }} state
 */
export function drawFrame(ctx, state) {
  ctx.save();

  // Background + lanes (with key-press flash)
  drawLanes(ctx, state.laneFlashes);

  // Hit zone (with hit effect rings)
  drawHitZone(ctx, state.hitEffects);

  // Lane labels (D F J K at top)
  drawLaneLabels(ctx);

  // Song title
  if (state.songTitle) {
    drawSongTitle(ctx, state.songTitle);
  }

  // Notes
  if (state.notes && state.notes.length > 0) {
    drawNotes(ctx, state.notes);
  }

  // Feedback text
  if (state.feedback && state.feedback.length > 0) {
    drawFeedback(ctx, state.feedback);
  }

  // Combo (big centered number above hit zone)
  if (state.combo > 1) {
    drawCombo(ctx, state.combo);
  }

  // Score + delta animation (top-right)
  drawScore(ctx, state.score ?? 0, state.scoreDelta ?? 0, state.scoreDeltaAge ?? 0);

  // Progress bar (bottom)
  if (state.songTimeS !== undefined && state.duration) {
    drawProgressBar(ctx, state.songTimeS, state.duration);
  }

  ctx.restore();
}

// --- Countdown Overlay --------------------------------------------------------

/**
 * Draw the 3-2-1-GO countdown overlay.
 * Called every frame while songTimeS < 0 (before audio starts).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} songTimeS — negative value representing seconds until start
 */
export function drawCountdown(ctx, songTimeS) {
  const remaining = Math.abs(songTimeS); // seconds until audio starts

  // Determine which phase we're in
  let text, color, scale;
  if (remaining > 2) {
    // "3"
    text = '3';
    color = '#ff6b6b';
    scale = 1;
  } else if (remaining > 1) {
    // "2"
    text = '2';
    color = '#ffd93d';
    scale = 1;
  } else if (remaining > 0) {
    // "1"
    text = '1';
    color = '#6bcb77';
    scale = 1;
  } else {
    // "GO!"
    text = 'GO!';
    color = '#4d96ff';
    scale = 1.2;
  }

  // Pulse effect — use the fractional part of remaining for a subtle scale pop
  const frac = remaining - Math.floor(remaining);
  const pulse = 1 + 0.08 * Math.sin(frac * Math.PI);
  const finalScale = scale * pulse;

  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(13, 13, 20, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Draw the number / GO
  ctx.save();
  ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
  ctx.scale(finalScale, finalScale);
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 40;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);

  // Brighter inner text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);

  ctx.restore();

  // Subtitle below the countdown number
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#555566';
  ctx.fillText('Get ready…', CANVAS_W / 2, CANVAS_H / 2 + 64);
}
