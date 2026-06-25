import { describe, it, expect, vi } from 'vitest';
import {
  analyzeAudio,
  getMonoSamples,
  detectOnsets,
  computeAdaptiveThreshold,
  generateTempoBasedBeats,
  findPeaks,
} from './audioAnalyzer.js';

// ---------------------------------------------------------------------------
// Helpers — mock AudioBuffer and AudioContext
// ---------------------------------------------------------------------------

/** Create a fake AudioBuffer from a Float32Array of mono samples. */
function makeAudioBuffer(samples, sampleRate = 44100) {
  return {
    length: samples.length,
    sampleRate,
    duration: samples.length / sampleRate,
    numberOfChannels: 1,
    getChannelData: () => samples,
  };
}

/** Create a fake AudioContext whose decodeAudioData returns the given buffer. */
function makeAudioCtx(audioBuffer) {
  return {
    decodeAudioData: vi.fn().mockResolvedValue(audioBuffer),
  };
}

/** Generate a sine wave with optional impulse spikes at given times. */
function generateTestSamples(durationS, sampleRate, impulses = []) {
  const length = Math.floor(durationS * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Low background sine
    samples[i] = 0.1 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  // Add sharp impulses (simulating beat attacks)
  for (const timeS of impulses) {
    const idx = Math.floor(timeS * sampleRate);
    if (idx < length) samples[idx] = 1.0;
    if (idx + 1 < length) samples[idx + 1] = 0.8;
  }
  return samples;
}

// ---------------------------------------------------------------------------
// getMonoSamples
// ---------------------------------------------------------------------------
describe('getMonoSamples', () => {
  it('returns mono data unchanged for a 1-channel buffer', () => {
    const data = new Float32Array([0.1, 0.2, 0.3]);
    const buf = makeAudioBuffer(data);
    const result = getMonoSamples(buf);
    // Float32Array has limited precision, use toBeCloseTo
    expect(result[0]).toBeCloseTo(0.1, 5);
    expect(result[1]).toBeCloseTo(0.2, 5);
    expect(result[2]).toBeCloseTo(0.3, 5);
  });

  it('averages two channels into mono', () => {
    const ch0 = new Float32Array([1.0, 0.5, -0.5]);
    const ch1 = new Float32Array([0.5, 1.0, -1.0]);
    const buf = {
      length: 3,
      numberOfChannels: 2,
      getChannelData: (ch) => (ch === 0 ? ch0 : ch1),
    };
    const result = getMonoSamples(buf);
    expect(result[0]).toBeCloseTo(0.75);
    expect(result[1]).toBeCloseTo(0.75);
    expect(result[2]).toBeCloseTo(-0.75);
  });
});

// ---------------------------------------------------------------------------
// computeAdaptiveThreshold
// ---------------------------------------------------------------------------
describe('computeAdaptiveThreshold', () => {
  it('returns an array of the same length as input', () => {
    const flux = new Float32Array([0, 1, 2, 3, 4]);
    const result = computeAdaptiveThreshold(flux, 3, 1.5);
    expect(result.length).toBe(5);
  });

  it('returns all zeros for zero flux', () => {
    const flux = new Float32Array([0, 0, 0, 0, 0]);
    const result = computeAdaptiveThreshold(flux, 2, 1.8);
    expect([...result]).toEqual([0, 0, 0, 0, 0]);
  });

  it('applies the multiplier correctly on a constant flux', () => {
    const flux = new Float32Array([10, 10, 10, 10]);
    const result = computeAdaptiveThreshold(flux, 4, 2.0);
    // Running mean of [10,10,10,10] with window=4 is always 10
    // Result should be 10 * 2.0 = 20 for all
    for (let i = 0; i < 4; i++) {
      expect(result[i]).toBeCloseTo(20);
    }
  });

  it('uses expanding window for early samples', () => {
    const flux = new Float32Array([4, 8, 12]);
    const result = computeAdaptiveThreshold(flux, 10, 1.0);
    // windowSize=10 > length=3, so effectiveWindow = i+1
    // i=0: mean=4/1=4, i=1: mean=12/2=6, i=2: mean=24/3=8
    expect(result[0]).toBeCloseTo(4);
    expect(result[1]).toBeCloseTo(6);
    expect(result[2]).toBeCloseTo(8);
  });
});

// ---------------------------------------------------------------------------
// findPeaks
// ---------------------------------------------------------------------------
describe('findPeaks', () => {
  it('finds a single clear peak', () => {
    const flux = new Float32Array([0, 0, 5, 0, 0]);
    const thresholds = new Float32Array([1, 1, 1, 1, 1]);
    const peaks = findPeaks(flux, thresholds, 1);
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ frameIdx: 2, fluxValue: 5 });
  });

  it('returns empty when nothing exceeds threshold', () => {
    const flux = new Float32Array([0, 1, 2, 1, 0]);
    const thresholds = new Float32Array([10, 10, 10, 10, 10]);
    const peaks = findPeaks(flux, thresholds, 1);
    expect(peaks).toHaveLength(0);
  });

  it('respects minimum distance between peaks', () => {
    // Two peaks close together — minDistance should filter one
    const flux = new Float32Array([0, 5, 0, 5, 0]);
    const thresholds = new Float32Array([0, 0, 0, 0, 0]);
    const peaks = findPeaks(flux, thresholds, 3); // minDistance=3
    expect(peaks).toHaveLength(1); // only first peak kept
    expect(peaks[0].frameIdx).toBe(1);
  });

  it('finds multiple peaks when spaced far enough apart', () => {
    const flux = new Float32Array([0, 5, 0, 0, 0, 8, 0]);
    const thresholds = new Float32Array([0, 0, 0, 0, 0, 0, 0]);
    const peaks = findPeaks(flux, thresholds, 2);
    expect(peaks).toHaveLength(2);
    expect(peaks[0].frameIdx).toBe(1);
    expect(peaks[1].frameIdx).toBe(5);
  });

  it('ignores edges (first and last frame)', () => {
    const flux = new Float32Array([10, 0, 0, 0, 10]);
    const thresholds = new Float32Array([0, 0, 0, 0, 0]);
    const peaks = findPeaks(flux, thresholds, 1);
    // Both edges — frame 0 is skipped (loop starts at 1), frame 4 is last
    // frame 4: flux[4]=10 >= flux[3]=0 but flux[5] doesn't exist → skipped
    expect(peaks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateTempoBasedBeats
// ---------------------------------------------------------------------------
describe('generateTempoBasedBeats', () => {
  it('uses default 120 BPM when no onsets detected', () => {
    const beats = generateTempoBasedBeats([], 10);
    // At 120 BPM, interval = 0.5s, starting at 0.5s
    expect(beats[0]).toBe(0.5);
    expect(beats[1]).toBe(1.0);
    expect(beats[2]).toBe(1.5);
  });

  it('estimates BPM from two detected onsets', () => {
    // Two onsets 0.5s apart → 120 BPM → interval 0.5s
    const beats = generateTempoBasedBeats([1.0, 1.5], 10);
    expect(beats[0]).toBe(1.0);
    expect(beats[1]).toBe(1.5);
  });

  it('starts at first detected onset when available', () => {
    const beats = generateTempoBasedBeats([2.0, 2.5], 10);
    expect(beats[0]).toBe(2.0);
  });

  it('starts at 0.5s when no onsets detected', () => {
    const beats = generateTempoBasedBeats([], 5);
    expect(beats[0]).toBe(0.5);
  });

  it('clamps BPM to 40–240 range', () => {
    // Onsets 0.15s apart → 60/0.15 = 400 BPM → clamped to 240
    const beats = generateTempoBasedBeats([0, 0.15], 5);
    const interval = beats[1] - beats[0];
    // At 240 BPM, interval = 60/240 = 0.25s
    expect(interval).toBeCloseTo(0.25);
  });

  it('fills the song duration with beats', () => {
    const beats = generateTempoBasedBeats([], 4);
    // At 120 BPM (0.5s interval), starting at 0.5: 0.5, 1.0, ..., 3.5
    expect(beats[beats.length - 1]).toBeLessThan(4.0);
    expect(beats[beats.length - 1]).toBeGreaterThan(3.0);
  });

  it('returns empty array when duration is very short', () => {
    const beats = generateTempoBasedBeats([], 0.3);
    expect(beats).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectOnsets
// ---------------------------------------------------------------------------
describe('detectOnsets', () => {
  it('returns empty array for very short samples', () => {
    const samples = new Float32Array(100); // too short for 2 frames
    const onsets = detectOnsets(samples, 44100);
    expect(onsets).toEqual([]);
  });

  it('returns empty array for silent audio', () => {
    const samples = new Float32Array(44100); // 1s of silence
    const onsets = detectOnsets(samples, 44100);
    expect(onsets).toEqual([]);
  });

  it('detects strong impulses as onsets', () => {
    // 2s of audio with sharp impulses at 0.5s, 1.0s, 1.5s
    const samples = generateTestSamples(2, 44100, [0.5, 1.0, 1.5]);
    const onsets = detectOnsets(samples, 44100);
    expect(onsets.length).toBeGreaterThan(0);
  });

  it('caps onset rate at 4 notes/sec (250ms minimum gap)', () => {
    // Create many closely-spaced impulses
    const impulses = [];
    for (let t = 0.5; t < 2.0; t += 0.05) {
      impulses.push(t); // 30 impulses in 1.5s → way over 4/sec
    }
    const samples = generateTestSamples(3, 44100, impulses);
    const onsets = detectOnsets(samples, 44100);

    // Check minimum gap between consecutive onsets
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i] - onsets[i - 1]).toBeGreaterThanOrEqual(0.25);
    }
  });
});

// ---------------------------------------------------------------------------
// analyzeAudio (integration)
// ---------------------------------------------------------------------------
describe('analyzeAudio', () => {
  it('decodes audio and returns onsets, buffer, and duration', async () => {
    const samples = generateTestSamples(3, 44100, [0.5, 1.0, 1.5, 2.0, 2.5]);
    const audioBuffer = makeAudioBuffer(samples, 44100);
    const audioCtx = makeAudioCtx(audioBuffer);

    const result = await analyzeAudio(new ArrayBuffer(100), audioCtx);

    expect(result).toHaveProperty('onsets');
    expect(result).toHaveProperty('audioBuffer');
    expect(result).toHaveProperty('duration');
    expect(Array.isArray(result.onsets)).toBe(true);
    expect(result.duration).toBeCloseTo(3);
  });

  it('calls decodeAudioData with a copy of the buffer', async () => {
    const samples = new Float32Array(44100);
    const audioBuffer = makeAudioBuffer(samples);
    const audioCtx = makeAudioCtx(audioBuffer);
    const input = new ArrayBuffer(100);

    await analyzeAudio(input, audioCtx);

    expect(audioCtx.decodeAudioData).toHaveBeenCalledTimes(1);
    // The argument should be a copy (slice), not the original
    const arg = audioCtx.decodeAudioData.mock.calls[0][0];
    expect(arg).not.toBe(input); // different object (slice creates new)
  });

  it('falls back to tempo-based beats when few onsets detected', async () => {
    // Silent audio → 0 onsets → triggers fallback
    const samples = new Float32Array(44100 * 5); // 5s silence
    const audioBuffer = makeAudioBuffer(samples, 44100);
    const audioCtx = makeAudioCtx(audioBuffer);

    const result = await analyzeAudio(new ArrayBuffer(100), audioCtx);

    // Should have tempo-based beats (at least 10 from 5s at 120 BPM)
    expect(result.onsets.length).toBeGreaterThan(5);
  });
});
