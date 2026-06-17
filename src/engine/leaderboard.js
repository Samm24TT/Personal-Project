// =============================================================================
// BeatStrike — Leaderboard (localStorage)
// =============================================================================
// Persists high-score entries to localStorage so scores survive page reloads.
// Each entry includes the player name, score, song title, date, accuracy,
// max combo, and total notes for context.
// =============================================================================

const STORAGE_KEY = 'beatstrike_leaderboard';

/**
 * @typedef {{
 *   name: string,
 *   score: number,
 *   songTitle: string,
 *   date: string,         // ISO date string
 *   accuracy: number,     // 0–1
 *   maxCombo: number,
 *   totalNotes: number,
 *   perfects: number,
 *   goods: number,
 *   misses: number,
 * }} LeaderboardEntry
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read all leaderboard entries, sorted highest score first.
 * @returns {LeaderboardEntry[]}
 */
export function getEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    /** @type {LeaderboardEntry[]} */
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/**
 * Save a new entry to the leaderboard.
 * Keeps the top 50 entries so localStorage doesn't grow unbounded.
 * @param {LeaderboardEntry} entry
 */
export function saveEntry(entry) {
  const entries = getEntries();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);

  // Keep top 50
  const trimmed = entries.slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/**
 * Return the top N entries.
 * @param {number} [n=10]
 * @returns {LeaderboardEntry[]}
 */
export function getTopN(n = 10) {
  return getEntries().slice(0, n);
}

/**
 * Check whether a score would make the top N.
 * @param {number} score
 * @param {number} [n=10]
 * @returns {boolean}
 */
export function isTopScore(score, n = 10) {
  const entries = getEntries();
  if (entries.length < n) return true;
  return score >= entries[n - 1].score;
}
