// =============================================================================
// BeatStrike — App Shell
// =============================================================================
// Manages the app state machine: upload → loading → playing.
// Owns the AudioContext so it can be shared between analysis and playback.
// =============================================================================

import { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import Game from './components/Game.jsx';
import { loadSettings } from './engine/settings.js';

export default function App() {
  const [screen, setScreen] = useState('upload');   // 'upload' | 'playing'
  const [beatmap, setBeatmap] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [songTitle, setSongTitle] = useState('');
  const [settings, setSettings] = useState(() => loadSettings());
  const [audioCtx, setAudioCtx] = useState(null);

  // Single AudioContext for the whole session (analysis + playback).
  // Created lazily on first user interaction to satisfy browser autoplay policy.
  // Stored in state so it can be passed as a prop without ref-during-render issues.
  const ensureAudioCtx = useCallback(() => {
    let ctx = audioCtx;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      setAudioCtx(ctx);
    }
    // Resume if suspended (browsers require user gesture)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }, [audioCtx]);

  // Callback from StartScreen when analysis completes
  const handleReady = useCallback((bm, buf, title) => {
    setBeatmap(bm);
    setAudioBuffer(buf);
    setSongTitle(title);
    setScreen('playing');
  }, []);

  // Restart — go back to upload screen
  const handleRestart = useCallback(() => {
    setScreen('upload');
    setBeatmap(null);
    setAudioBuffer(null);
    setSongTitle('');
  }, []);

  return (
    <>
      {screen === 'upload' && (
        <StartScreen
          ensureAudioCtx={ensureAudioCtx}
          onReady={handleReady}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}
      {screen === 'playing' && beatmap && audioBuffer && (
        <Game
          beatmap={beatmap}
          audioBuffer={audioBuffer}
          audioCtx={audioCtx}
          songTitle={songTitle}
          onRestart={handleRestart}
          settings={settings}
        />
      )}
    </>
  );
}
