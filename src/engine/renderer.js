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
  PANEL_X,
  PANEL_Y,
  PANEL_W,
  PANEL_H,
  PANEL_R,
  VIS_BAR_COUNT,
  VIS_MAX_HEIGHT,
  VIS_OPACITY,
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

// --- Audio Visualization (frequency bars behind lanes) ------------------------

/**
 * Draw frequency-reactive bars spanning the full canvas width.
 * Rendered first in the frame so lanes and notes appear on top.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Uint8Array|null} freqData — 0–255 per frequency bin (from AnalyserNode)
 */
export function drawVisualization(ctx, freqData) {
  if (!freqData || freqData.length === 0) return;

  const binCount = freqData.length;
  const barCount = VIS_BAR_COUNT;
  const barW = CANVAS_W / barCount;
  const maxH = VIS_MAX_HEIGHT;

  // Lane colours for gradient across bars: red → yellow → green → blue
  const laneColors = LANES.map((l) => l.color);

  ctx.save();
  ctx.globalAlpha = VIS_OPACITY;

  for (let i = 0; i < barCount; i++) {
    // Map bar index → frequency bin (sample evenly across available bins)
    const binIdx = Math.floor((i / barCount) * binCount);
    const amplitude = freqData[binIdx] / 255; // normalize to 0–1
    const barH = amplitude * maxH;
    if (barH < 1) continue;

    const x = i * barW;
    const y = CANVAS_H - barH;

    // Colour: interpolate across the 4 lane colours
    const t = i / (barCount - 1); // 0 → 1
    const colorIdx = t * (laneColors.length - 1);
    const lo = Math.floor(colorIdx);
    const hi = Math.min(lo + 1, laneColors.length - 1);
    const frac = colorIdx - lo;

    const color = lerpColor(laneColors[lo], laneColors[hi], frac);

    // Bar with subtle glow
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, barW - 1, barH);
  }

  ctx.restore();
}

/**
 * Linearly interpolate between two hex colours.
 * @param {string} a — #RRGGBB
 * @param {string} b — #RRGGBB
 * @param {number} t — 0–1
 * @returns {string} — rgba() colour string
 */
function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
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
 * Draw hit-feedback text (Perfect / Good / Miss) — large, centered on each lane,
 * with a bold glow that matches the judgement quality.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{ text: string, lane: number, y: number, opacity: number, color: string }>} feedbackItems
 */
export function drawFeedback(ctx, feedbackItems) {
  for (const fb of feedbackItems) {
    ctx.save();
    ctx.globalAlpha = fb.opacity;

    const cx = laneCentreX(fb.lane);
    const fontSize = fb.text === 'PERFECT' ? 22 : fb.text === 'GOOD' ? 18 : 16;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = fb.color;

    // Strong glow for pop
    ctx.shadowColor = fb.color;
    ctx.shadowBlur = 14;

    ctx.fillText(fb.text, cx, fb.y);

    // Second pass — white core for crispness
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(fb.text, cx, fb.y);

    ctx.restore();
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

  // Position: centered, above the lane label area
  const textY = 20;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textDim;

  // Truncate if too long (leave room for score panel on left)
  const maxW = CANVAS_W - PANEL_W - PANEL_X - 30;
  const metrics = ctx.measureText(display);
  const text = metrics.width > maxW
    ? display.slice(0, Math.floor(display.length * maxW / metrics.width) - 1) + '…'
    : display;

  ctx.fillText(text, CANVAS_W / 2, textY);
}

// --- Score Panel (glassmorphism card) ---------------------------------------

/**
 * Draw a glassmorphism score card on the upper-left of the canvas.
 * Shows the current score prominently, plus an animated delta pop-up
 * and a subtle ++ counter when points are earned.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} score
 * @param {number} combo
 * @param {number} scoreDelta   — points just earned (0 = none to show)
 * @param {number} deltaAgeMs   — how long since the delta appeared
 * @param {number} accuracy     — 0–1 hit rate
 */
export function drawScorePanel(ctx, score, combo, scoreDelta, deltaAgeMs, accuracy) {
  const x = PANEL_X;
  const y = PANEL_Y;
  const w = PANEL_W;
  const h = PANEL_H;
  const r = PANEL_R;

  // --- Glassmorphism backdrop ---
  // Semi-transparent dark fill
  ctx.fillStyle = 'rgba(13, 13, 24, 0.78)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();

  // Soft outer glow
  ctx.save();
  ctx.shadowColor = 'rgba(100, 100, 255, 0.15)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // --- "SCORE" label ---
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('SCORE', x + 10, y + 10);

  // --- Large score number ---
  const scoreText = formatPanelNumber(score);
  ctx.font = `bold ${score > 99999 ? 18 : 22}px system-ui, monospace`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(scoreText, x + 10, y + 24);

  // --- Animated +points pop-up ---
  const DELTA_DURATION = 800;
  if (scoreDelta > 0 && deltaAgeMs < DELTA_DURATION) {
    const t = deltaAgeMs / DELTA_DURATION;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px system-ui, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffd93d';
    ctx.shadowColor = '#ffd93d';
    ctx.shadowBlur = 6;
    ctx.fillText(`+${scoreDelta}`, x + w - 10, y + 30 - t * 20);
    ctx.restore();
  }

  // --- Divider line ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 58);
  ctx.lineTo(x + w - 10, y + 58);
  ctx.stroke();

  // --- Combo row (with flame icon) ---
  const comboY = y + 66;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (combo >= 10) {
    // Flame emoji for high combos
    ctx.font = '14px system-ui, sans-serif';
    const flame = combo >= 100 ? '🔥' : combo >= 50 ? '💥' : '⚡';
    ctx.fillText(flame, x + 10, comboY);
    ctx.font = 'bold 12px system-ui, sans-serif';
  }

  // Combo number
  const comboColor = combo >= 100 ? '#ffd93d' : combo >= 50 ? '#ff6b6b' : combo >= 25 ? '#4d96ff' : COLORS.textDim;
  ctx.fillStyle = comboColor;
  ctx.fillText(`${combo}x`, x + 28, comboY);

  // Combo label
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText('COMBO', x + 28 + ctx.measureText(`${combo}x`).width + 4, comboY + 2);

  // --- Accuracy row ---
  const accY = y + 94;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const accPct = Math.round(accuracy * 100);
  let accColor = '#6bcb77'; // green
  if (accPct < 80) accColor = '#ffd93d'; // yellow
  if (accPct < 60) accColor = '#ff6b6b'; // red

  ctx.fillStyle = accColor;
  ctx.fillText(`${accPct}%`, x + 10, accY);

  ctx.fillStyle = COLORS.textDim;
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillText('ACC', x + 10 + ctx.measureText(`${accPct}%`).width + 4, accY + 2);

  // --- Accuracy bar ---
  const barW = w - 20;
  const barH = 3;
  const barX = x + 10;
  const barY = accY + 20;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 2);
  ctx.fill();

  if (accuracy > 0) {
    const fillColor = accuracy >= 0.9 ? '#6bcb77' : accuracy >= 0.7 ? '#ffd93d' : '#ff6b6b';
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * accuracy, barH, 2);
    ctx.fill();
  }
}

/** Format a number for the score panel. Shortens large numbers with k/M. */
function formatPanelNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

// --- Combo Display (large centered above hit zone) --------------------------

/**
 * Draw a large prominent combo counter above the hit zone.
 * Colours escalate dramatically at milestones:
 *   < 50  → white
 *   50+   → gold with pulsing glow
 *   100+  → rainbow hue cycling
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} combo
 * @param {number} songTimeS — for hue animation at 100x
 */
export function drawCombo(ctx, combo, songTimeS) {
  if (combo < 10) return;

  const cx = CANVAS_W / 2;
  const y = HIT_ZONE_Y - 72;

  // --- Colour selection ---
  let color;
  if (combo >= 100) {
    // Rainbow cycling
    const hue = ((songTimeS * 120) % 360);
    color = `hsl(${hue}, 80%, 60%)`;
  } else if (combo >= 50) {
    color = '#ffd93d';   // gold
  } else if (combo >= 25) {
    color = '#ff6b6b';   // hot red
  } else {
    color = '#ffffff';
  }

  ctx.save();

  // Pulsing glow (intensity scales with combo)
  const glowIntensity = combo >= 100 ? 40 : combo >= 50 ? 30 : 16;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowIntensity + (combo % 5) * 1.5;

  // "COMBO" label
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText('COMBO', cx, y - 4);

  // Combo number — grows with combo
  const fontSize = Math.min(56, 30 + combo * 0.25);
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 1;
  ctx.fillText(String(combo), cx, y);

  ctx.restore();
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
 *   accuracy: number,
 *   laneFlashes: number[],
 *   hitEffects: Array,
 *   songTitle: string,
 *   songTimeS: number,
 *   duration: number,
 *   freqData: Uint8Array|null,
 * }} state
 */
export function drawFrame(ctx, state) {
  ctx.save();

  // Audio visualization (frequency bars, behind everything)
  if (state.freqData) {
    drawVisualization(ctx, state.freqData);
  }

  // Background + lanes (with key-press flash)
  drawLanes(ctx, state.laneFlashes);

  // Hit zone (with hit effect rings)
  drawHitZone(ctx, state.hitEffects);

  // Lane labels (D F J K at top)
  drawLaneLabels(ctx);

  // Song title (centered top)
  if (state.songTitle) {
    drawSongTitle(ctx, state.songTitle);
  }

  // Notes
  if (state.notes && state.notes.length > 0) {
    drawNotes(ctx, state.notes);
  }

  // Feedback text (large, per-lane, centered)
  if (state.feedback && state.feedback.length > 0) {
    drawFeedback(ctx, state.feedback);
  }

  // Combo (big centered number above hit zone)
  if (state.combo >= 10) {
    drawCombo(ctx, state.combo, state.songTimeS ?? 0);
  }

  // Glassmorphism score panel (upper-left card)
  drawScorePanel(
    ctx,
    state.score ?? 0,
    state.combo ?? 0,
    state.scoreDelta ?? 0,
    state.scoreDeltaAge ?? 0,
    state.accuracy ?? 0,
  );

  // Progress bar (bottom, with time labels)
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
