// =============================================================================
// BeatStrike — Audio Visualizer (Real-time Frequency Analysis)
// =============================================================================
// Connects an AnalyserNode to the audio source to capture real-time frequency
// data for rendering visualization bars behind the lanes.
// =============================================================================

import { VIS_SMOOTHING, VIS_FFT_SIZE } from '../constants.js';

/**
 * Create an AnalyserNode wired between the audio source and destination.
 *
 * Audio graph: sourceNode → analyser → audioCtx.destination
 *
 * The caller should NOT also connect sourceNode to destination — this
 * function handles the full chain.
 *
 * @param {AudioContext} audioCtx
 * @param {AudioBufferSourceNode} sourceNode
 * @param {object} [opts]
 * @param {number} [opts.smoothing] — smoothingTimeConstant (0–1)
 * @param {number} [opts.fftSize]   — must be power of 2 (32–32768)
 * @returns {{ analyser: AnalyserNode, dataArray: Uint8Array }}
 */
export function createVisualizer(audioCtx, sourceNode, opts = {}) {
  const analyser = audioCtx.createAnalyser();
  analyser.smoothingTimeConstant = opts.smoothing ?? VIS_SMOOTHING;
  analyser.fftSize = opts.fftSize ?? VIS_FFT_SIZE;

  // Wire: source → analyser → destination
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Frequency bin count is fftSize / 2
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  return { analyser, dataArray };
}

/**
 * Fill the dataArray with the current frequency-domain data.
 * Each value is 0–255 representing the amplitude of a frequency bin.
 *
 * @param {AnalyserNode} analyser
 * @param {Uint8Array} dataArray — must match analyser.frequencyBinCount
 * @returns {Uint8Array} the same dataArray (filled in-place)
 */
export function getFrequencyData(analyser, dataArray) {
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}
