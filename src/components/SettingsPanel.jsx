// =============================================================================
// BeatStrike — Settings Panel
// =============================================================================
// Slide-down panel on the start screen for scroll speed and visual effects.
// =============================================================================

import { saveSettings } from '../engine/settings.js';
import './SettingsPanel.css';

const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75x' },
  { value: 1,    label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5,  label: '1.5x' },
];

/**
 * @param {{
 *   settings: { scrollSpeed: number, particles: boolean },
 *   onChange: (settings: { scrollSpeed: number, particles: boolean }) => void,
 *   open: boolean,
 *   onClose: () => void,
 * }} props
 */
export default function SettingsPanel({ settings, onChange, open, onClose }) {
  const handleSpeed = (value) => {
    const next = { ...settings, scrollSpeed: value };
    saveSettings(next);
    onChange(next);
  };

  const handleParticles = () => {
    const next = { ...settings, particles: !settings.particles };
    saveSettings(next);
    onChange(next);
  };

  return (
    <div className={`settings-panel${open ? ' settings-panel--open' : ''}`}>
      <div className="settings-header">
        <span className="settings-title">⚙ Settings</span>
        <button className="settings-close" onClick={onClose}>✕</button>
      </div>

      {/* Scroll Speed */}
      <div className="settings-row">
        <span className="settings-label">Scroll Speed</span>
        <div className="settings-speed-btns">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`speed-btn${settings.scrollSpeed === opt.value ? ' speed-btn--active' : ''}`}
              onClick={() => handleSpeed(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Effects */}
      <div className="settings-row">
        <span className="settings-label">Hit Particles</span>
        <button
          className={`toggle-btn${settings.particles ? ' toggle-btn--on' : ''}`}
          onClick={handleParticles}
        >
          <span className="toggle-knob" />
        </button>
      </div>
    </div>
  );
}
