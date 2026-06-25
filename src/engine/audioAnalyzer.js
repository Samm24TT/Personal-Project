// =============================================================================
// BeatStrike — Audio Analyzer (Offline Onset Detection)
// =============================================================================
// Takes an MP3 ArrayBuffer, decodes it with the Web Audio API, and runs an
// energy-based onset-detection algorithm on the raw PCM samples to find beat
// timestamps.
// =============================================================================

// --- Public API ---------------------------------------------------------------

/**
 * Analyze an uploaded audio file and return onset timestamps.
 *
 * @param {ArrayBuffer} arrayBuffer  — raw file bytes (MP3, WAV, etc.)
 * @param {AudioContext} audioCtx    — reusable context (will also be used for playback)
 * @returns {Promise<{
 *   onsets: number[],        // beat timestamps in seconds
 *   audioBuffer: AudioBuffer,// decoded buffer ready for playback
 *   duration: number,        // song length in seconds
 * }>}
 */
export async function analyzeAudio(arrayBuffer, audioCtx) {
  // 1. Decode the compressed audio into raw PCM
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

  // 2. Extract mono samples (average channels)
  const samples = getMonoSamples(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;

  // 3. Onset detection
  let onsets = detectOnsets(samples, sampleRate);

  console.log(
    `[audioAnalyzer] Onset detection found ${onsets.length} beats ` +
    `in ${audioBuffer.duration.toFixed(1)}s song.`,
  );

  // 4. Fallback: if too few onsets were found, generate a steady beat
  //    from an estimated (or default) BPM so the game is still playable.
  const MIN_ONSETS = 10;
  if (onsets.length < MIN_ONSETS) {
    console.log(
      `[audioAnalyzer] Only ${onsets.length} onsets (< ${MIN_ONSETS}) — ` +
      `falling back to tempo-based generation.`,
    );
    onsets = generateTempoBasedBeats(onsets, audioBuffer.duration);
  }

  return {
    onsets,
    audioBuffer,
    duration: audioBuffer.duration,
  };
}

// --- Mono extraction ----------------------------------------------------------

export function getMonoSamples(audioBuffer) {
  const length = audioBuffer.length;
  const channels = audioBuffer.numberOfChannels;

  const result = new Float32Array(length);

  for (let ch = 0; ch < channels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      result[i] += data[i];
    }
  }

  if (channels > 1) {
    for (let i = 0; i < length; i++) {
      result[i] /= channels;
    }
  }

  return result;
}

// --- Onset Detection ----------------------------------------------------------

/**
 * Energy-based onset (beat) detection.
 *
 * Algorithm:
 *   1. Split audio into frames with overlap
 *   2. Compute RMS energy per frame
 *   3. Compute spectral flux (positive energy delta between consecutive frames)
 *   4. Apply adaptive threshold (running mean of flux * multiplier)
 *   5. Find peaks above threshold with minimum inter-onset spacing
 *
 * @param {Float32Array} samples    — mono PCM samples
 * @param {number}       sampleRate
 * @returns {number[]}              — onset times in seconds
 */
export function detectOnsets(samples, sampleRate) {
  // --- Frame parameters ---
  const frameSize = 1024;                           // ~23 ms at 44.1 kHz
  const hopSize   = 512;                            // 50 % overlap
  const numFrames = Math.floor((samples.length - frameSize) / hopSize);

  if (numFrames < 2) return [];                     // file too short

  // --- 1. Per-frame RMS energy ---
  const energies = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    const offset = i * hopSize;
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      sum += samples[offset + j] * samples[offset + j];
    }
    energies[i] = Math.sqrt(sum / frameSize);
  }

  // --- 2. Spectral flux (positive difference only) ---
  // This highlights sudden *increases* in energy (note attacks)
  // while ignoring sustained tones or gradual decays.
  const flux = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    flux[i] = Math.max(0, energies[i] - energies[i - 1]);
  }
  flux[0] = 0;

  // --- 3. Adaptive threshold ---
  // A fixed threshold fails for quiet vs. loud sections.
  // We use a running mean + multiplier so the detector adapts locally.
  const meanWindowFrames = Math.round((0.2 * sampleRate) / hopSize); // ~200 ms window
  const multiplier      = 1.8;  // sensitivity — lower = more beats, higher = fewer
  const thresholds      = computeAdaptiveThreshold(flux, meanWindowFrames, multiplier);

  // --- 4. Peak picking (150 ms minimum global gap) ---
  const minDistanceFrames = Math.round((0.15 * sampleRate) / hopSize);
  const peaks             = findPeaks(flux, thresholds, minDistanceFrames);

  // --- 5. Keep only the strongest 40 % of onsets ---
  // Sort by flux value descending so the most prominent beats survive.
  peaks.sort((a, b) => b.fluxValue - a.fluxValue);
  const keepCount = Math.max(1, Math.ceil(peaks.length * 0.4));
  const strongest = peaks.slice(0, keepCount);

  // --- 6. Convert frame indices → seconds, sorted by time ---
  let onsets = strongest
    .map((p) => (p.frameIdx * hopSize) / sampleRate)
    .sort((a, b) => a - b);

  // --- 7. Enforce global 4 notes / second cap (min 250 ms gap) ---
  if (onsets.length === 0) return [];

  const MIN_GLOBAL_GAP_S = 0.25;
  const capped = [onsets[0]];
  for (let i = 1; i < onsets.length; i++) {
    if (onsets[i] - capped[capped.length - 1] >= MIN_GLOBAL_GAP_S) {
      capped.push(onsets[i]);
    }
  }

  return capped;
}

// --- Adaptive threshold (running mean of flux) ---------------------------------

export function computeAdaptiveThreshold(flux, windowSize, multiplier) {
  const len   = flux.length;
  const result = new Float32Array(len);

  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += flux[i];
    if (i >= windowSize) {
      sum -= flux[i - windowSize];
    }
    const effectiveWindow = Math.min(i + 1, windowSize);
    result[i] = (sum / effectiveWindow) * multiplier;
  }

  return result;
}

// --- Tempo-based fallback beat generation ----------------------------------

/**
 * If onset detection finds too few beats, estimate a BPM from whatever onsets
 * we have (or use a default) and generate a steady stream of note timestamps
 * across the entire song duration.
 *
 * @param {number[]} detectedOnsets — the few onsets that *were* found (may be empty)
 * @param {number}   durationS      — total song length in seconds
 * @returns {number[]}              — dense array of beat timestamps in seconds
 */
export function generateTempoBasedBeats(detectedOnsets, durationS) {
  // --- 1. Estimate BPM ---
  let bpm = 120; // default

  if (detectedOnsets.length >= 2) {
    // Average inter-onset interval
    let totalGap = 0;
    for (let i = 1; i < detectedOnsets.length; i++) {
      totalGap += detectedOnsets[i] - detectedOnsets[i - 1];
    }
    const avgInterval = totalGap / (detectedOnsets.length - 1);
    // Clamp to reasonable range (40–240 BPM)
    if (avgInterval > 0.1 && avgInterval < 2.0) {
      bpm = 60 / avgInterval;
    }
  }

  // Clamp BPM to a sane range
  bpm = Math.max(40, Math.min(240, bpm));
  console.log(`[audioAnalyzer] Estimated BPM: ${Math.round(bpm)}`);

  // --- 2. Generate beats ---
  // Use quarter-note spacing: one beat every (60 / bpm) seconds.
  // Start at the first detected onset (or 0.5s) and fill the song.
  const intervalS = 60 / bpm;
  const startS = detectedOnsets.length > 0 ? detectedOnsets[0] : 0.5;
  const beats = [];

  for (let t = startS; t < durationS - 0.1; t += intervalS) {
    beats.push(t);
  }

  console.log(`[audioAnalyzer] Generated ${beats.length} tempo-based beats.`);
  return beats;
}

// --- Peak picker ---------------------------------------------------------------

export function findPeaks(flux, thresholds, minDistance) {
  const peaks = [];
  let lastPeak = -minDistance;

  for (let i = 1; i < flux.length - 1; i++) {
    if (
      flux[i] > thresholds[i] &&             // above adaptive threshold
      flux[i] >= flux[i - 1] &&               // local maximum (left)
      flux[i] > flux[i + 1] &&                // local maximum (right)
      i - lastPeak >= minDistance             // minimum spacing
    ) {
      peaks.push({ frameIdx: i, fluxValue: flux[i] });
      lastPeak = i;
    }
  }

  return peaks;
}
