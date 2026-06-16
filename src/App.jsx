// =============================================================================
// BeatStrike — App Shell
// =============================================================================
// Manages the app state machine: upload → loading → playing.
// Owns the AudioContext so it can be shared between analysis and playback.
// =============================================================================

import { useState, useRef, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import Game from './components/Game.jsx';

export default function App() {
  const [screen, setScreen] = useState('upload');   // 'upload' | 'playing'
  const [beatmap, setBeatmap] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);

  // Single AudioContext for the whole session (analysis + playback).
  // Created lazily on first user interaction to satisfy browser autoplay policy.
  const audioCtxRef = useRef(null);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers require user gesture)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Callback from StartScreen when analysis completes
  const handleReady = useCallback((bm, buf) => {
    setBeatmap(bm);
    setAudioBuffer(buf);
    setScreen('playing');
  }, []);

  // Restart — go back to upload screen
  const handleRestart = useCallback(() => {
    setScreen('upload');
    setBeatmap(null);
    setAudioBuffer(null);
  }, []);

  return (
    <>
      {screen === 'upload' && (
        <StartScreen
          ensureAudioCtx={ensureAudioCtx}
          onReady={handleReady}
        />
      )}
      {screen === 'playing' && beatmap && audioBuffer && (
        <Game
          beatmap={beatmap}
          audioBuffer={audioBuffer}
          audioCtx={audioCtxRef.current}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
