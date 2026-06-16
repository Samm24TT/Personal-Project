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
  const onsets = detectOnsets(samples, sampleRate);

  return {
    onsets,
    audioBuffer,
    duration: audioBuffer.duration,
  };
}

// --- Mono extraction ----------------------------------------------------------

function getMonoSamples(audioBuffer) {
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
function detectOnsets(samples, sampleRate) {
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
  const multiplier      = 2.2;  // sensitivity — lower = more beats, higher = fewer
  const thresholds      = computeAdaptiveThreshold(flux, meanWindowFrames, multiplier);

  // --- 4. Peak picking ---
  const minDistanceFrames = Math.round((0.08 * sampleRate) / hopSize); // min 80 ms between beats
  const onsetsSamples     = findPeaks(flux, thresholds, minDistanceFrames);

  // Convert frame-offset-based indices → seconds
  return onsetsSamples.map((offset) => offset / sampleRate);
}

// --- Adaptive threshold (running mean of flux) ---------------------------------

function computeAdaptiveThreshold(flux, windowSize, multiplier) {
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

// --- Peak picker ---------------------------------------------------------------

function findPeaks(flux, thresholds, minDistance) {
  const peaks = [];
  let lastPeak = -minDistance;

  for (let i = 1; i < flux.length - 1; i++) {
    if (
      flux[i] > thresholds[i] &&             // above adaptive threshold
      flux[i] >= flux[i - 1] &&               // local maximum (left)
      flux[i] > flux[i + 1] &&                // local maximum (right)
      i - lastPeak >= minDistance             // minimum spacing
    ) {
      peaks.push(i);                          // return in sample-offset units
      lastPeak = i;
    }
  }

  return peaks;
}
