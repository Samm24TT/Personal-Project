import { describe, it, expect, beforeEach } from 'vitest';
import { getEntries, saveEntry, getTopN, isTopScore } from './leaderboard.js';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
let store = {};

beforeEach(() => {
  store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
  };
});

/** Helper: create a minimal valid entry. */
function makeEntry(overrides = {}) {
  return {
    name: 'Player',
    score: 1000,
    songTitle: 'Test Song',
    date: '2026-06-25',
    accuracy: 0.85,
    maxCombo: 50,
    totalNotes: 100,
    perfects: 70,
    goods: 15,
    misses: 15,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getEntries
// ---------------------------------------------------------------------------
describe('getEntries', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(getEntries()).toEqual([]);
  });

  it('returns empty array for malformed JSON', () => {
    store['beatstrike_leaderboard'] = '{not valid json';
    expect(getEntries()).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    store['beatstrike_leaderboard'] = '{"score": 100}';
    expect(getEntries()).toEqual([]);
  });

  it('returns entries sorted by score descending', () => {
    const entries = [
      makeEntry({ score: 500 }),
      makeEntry({ score: 2000 }),
      makeEntry({ score: 1000 }),
    ];
    store['beatstrike_leaderboard'] = JSON.stringify(entries);

    const result = getEntries();
    expect(result.map((e) => e.score)).toEqual([2000, 1000, 500]);
  });
});

// ---------------------------------------------------------------------------
// saveEntry
// ---------------------------------------------------------------------------
describe('saveEntry', () => {
  it('persists an entry to localStorage', () => {
    saveEntry(makeEntry({ score: 42 }));

    const stored = JSON.parse(store['beatstrike_leaderboard']);
    expect(stored).toHaveLength(1);
    expect(stored[0].score).toBe(42);
  });

  it('keeps entries sorted by score descending', () => {
    saveEntry(makeEntry({ score: 100 }));
    saveEntry(makeEntry({ score: 300 }));
    saveEntry(makeEntry({ score: 200 }));

    const result = getEntries();
    expect(result.map((e) => e.score)).toEqual([300, 200, 100]);
  });

  it('trims to top 50 entries', () => {
    for (let i = 0; i < 60; i++) {
      saveEntry(makeEntry({ score: i }));
    }

    const result = getEntries();
    expect(result).toHaveLength(50);
    // Highest scores should survive
    expect(result[0].score).toBe(59);
  });

  it('silently ignores localStorage being full', () => {
    // Override setItem to throw (simulates quota exceeded)
    globalThis.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    // Should not throw
    expect(() => saveEntry(makeEntry())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getTopN
// ---------------------------------------------------------------------------
describe('getTopN', () => {
  it('returns top N entries', () => {
    for (let i = 0; i < 20; i++) {
      saveEntry(makeEntry({ score: i * 100 }));
    }

    const top5 = getTopN(5);
    expect(top5).toHaveLength(5);
    expect(top5[0].score).toBe(1900);
  });

  it('defaults to 10 when no argument', () => {
    for (let i = 0; i < 20; i++) {
      saveEntry(makeEntry({ score: i }));
    }
    expect(getTopN()).toHaveLength(10);
  });

  it('returns all entries when N > total entries', () => {
    saveEntry(makeEntry({ score: 100 }));
    saveEntry(makeEntry({ score: 200 }));
    expect(getTopN(10)).toHaveLength(2);
  });

  it('returns empty array when no entries exist', () => {
    expect(getTopN(5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isTopScore
// ---------------------------------------------------------------------------
describe('isTopScore', () => {
  it('returns true when fewer than N entries exist', () => {
    saveEntry(makeEntry({ score: 100 }));
    expect(isTopScore(50, 10)).toBe(true);
  });

  it('returns true when score equals the Nth entry', () => {
    for (let i = 0; i < 10; i++) {
      saveEntry(makeEntry({ score: (i + 1) * 100 }));
    }
    // Lowest of top 10 is 100
    expect(isTopScore(100, 10)).toBe(true);
  });

  it('returns true when score exceeds the Nth entry', () => {
    for (let i = 0; i < 10; i++) {
      saveEntry(makeEntry({ score: (i + 1) * 100 }));
    }
    expect(isTopScore(9999, 10)).toBe(true);
  });

  it('returns false when score is below the Nth entry', () => {
    for (let i = 0; i < 10; i++) {
      saveEntry(makeEntry({ score: (i + 1) * 100 }));
    }
    expect(isTopScore(50, 10)).toBe(false);
  });

  it('defaults to checking top 10', () => {
    for (let i = 0; i < 10; i++) {
      saveEntry(makeEntry({ score: 1000 }));
    }
    expect(isTopScore(1000)).toBe(true);
    expect(isTopScore(1)).toBe(false);
  });
});
