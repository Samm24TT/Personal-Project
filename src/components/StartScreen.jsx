// =============================================================================
// BeatStrike — Start / Upload Screen
// =============================================================================
// Renders before the game begins.  User uploads an MP3, the app analyzes it,
// and once beats are detected the parent transitions to the Game view.
// =============================================================================

import { useState, useRef, useCallback } from 'react';
import { analyzeAudio } from '../engine/audioAnalyzer.js';
import { generateBeatmap, resetNoteIds } from '../engine/beatmap.js';
import './StartScreen.css';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   ensureAudioCtx: () => AudioContext,
 *   onReady: (beatmap: Array, audioBuffer: AudioBuffer) => void,
 * }} props
 */
export default function StartScreen({ ensureAudioCtx, onReady }) {
  const [status, setStatus] = useState('idle');    // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef(null);

  // --- Process uploaded file -----------------------------------------------
  const processFile = useCallback(async (file) => {
    if (!file) return;

    // Validate
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
      setStatus('error');
      setErrorMsg('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }

    setFileName(file.name);
    setStatus('loading');
    setErrorMsg('');

    try {
      // Read file bytes
      const arrayBuffer = await file.arrayBuffer();

      // Create / resume AudioContext on user gesture (browser autoplay policy)
      const audioCtx = ensureAudioCtx();

      // Analyze (decode + onset detection)
      const { onsets, audioBuffer } = await analyzeAudio(arrayBuffer, audioCtx);

      if (onsets.length === 0) {
        setStatus('error');
        setErrorMsg('No beats detected — try a different song with a clearer rhythm.');
        return;
      }

      // Generate beatmap from onsets
      resetNoteIds();
      const beatmap = generateBeatmap(onsets);

      onReady(beatmap, audioBuffer, file.name);
    } catch (err) {
      console.error('Audio analysis failed:', err);
      setStatus('error');
      setErrorMsg('Could not process the audio file. Make sure it is a valid MP3.');
    }
  }, [ensureAudioCtx, onReady]);

  // --- Drag & drop handlers ------------------------------------------------
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const onFileChange = useCallback((e) => {
    const file = e.target.files[0];
    processFile(file);
    // Reset so re-uploading the same file triggers onChange
    e.target.value = '';
  }, [processFile]);

  // --- Render ---------------------------------------------------------------
  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="start-title">BeatStrike</h1>
        <p className="start-subtitle">Upload an MP3 and play along</p>

        {/* Drop zone  */}
        {status !== 'loading' && (
          <label
            className={`drop-zone${dragOver ? ' drop-zone--active' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac"
              className="drop-zone__input"
              onChange={onFileChange}
            />
            <div className="drop-zone__icon">♪</div>
            <p className="drop-zone__text">
              {fileName
                ? `Loaded: ${fileName}`
                : 'Drop an MP3 here or click to browse'}
            </p>
          </label>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="loading-box">
            <div className="spinner" />
            <p className="loading-text">Analyzing beats…</p>
            <p className="loading-file">{fileName}</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="error-box">
            <p className="error-text">{errorMsg}</p>
            <button
              className="error-retry"
              onClick={() => setStatus('idle')}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
