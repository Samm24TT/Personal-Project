// =============================================================================
// BeatStrike — Settings (localStorage persistence)
// =============================================================================

const STORAGE_KEY = 'beatstrike-settings';

const DEFAULTS = {
  scrollSpeed: 1,      // multiplier: 0.75, 1, 1.25, 1.5
  particles: true,     // hit particles on/off
};

/**
 * Load settings from localStorage, falling back to defaults.
 * @returns {{ scrollSpeed: number, particles: boolean }}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const saved = JSON.parse(raw);
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Save settings to localStorage.
 * @param {{ scrollSpeed?: number, particles?: boolean }} settings
 */
export function saveSettings(settings) {
  try {
    const current = loadSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* silently fail */ }
}
