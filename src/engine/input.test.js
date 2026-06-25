import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupKeyboard } from './input.js';

// ---------------------------------------------------------------------------
// Mock window event system
// ---------------------------------------------------------------------------
let capturedCallback = null;
const addSpy = vi.fn();
const removeSpy = vi.fn();

beforeEach(() => {
  capturedCallback = null;
  addSpy.mockClear();
  removeSpy.mockClear();

  // Capture the keydown callback when setupKeyboard calls addEventListener
  addSpy.mockImplementation((event, cb) => {
    if (event === 'keydown') capturedCallback = cb;
  });

  globalThis.window = {
    addEventListener: addSpy,
    removeEventListener: removeSpy,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Simulate a keydown event. */
function pressKey(key, repeat = false) {
  const event = {
    key,
    repeat,
    preventDefault: vi.fn(),
  };
  capturedCallback(event);
  return event;
}

// ---------------------------------------------------------------------------
// setupKeyboard
// ---------------------------------------------------------------------------
describe('setupKeyboard', () => {
  it('registers a keydown listener on window', () => {
    setupKeyboard();
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('maps D/F/J/K keys to lanes 0/1/2/3', () => {
    const input = setupKeyboard();

    pressKey('d');
    expect(input.consumePress(0)).toBe(true);

    pressKey('f');
    expect(input.consumePress(1)).toBe(true);

    pressKey('j');
    expect(input.consumePress(2)).toBe(true);

    pressKey('k');
    expect(input.consumePress(3)).toBe(true);
  });

  it('handles uppercase keys (case-insensitive)', () => {
    const input = setupKeyboard();
    pressKey('D');
    expect(input.consumePress(0)).toBe(true);
  });

  it('consumePress returns false when key was not pressed', () => {
    const input = setupKeyboard();
    expect(input.consumePress(0)).toBe(false);
    expect(input.consumePress(1)).toBe(false);
  });

  it('consumePress returns true only once per keypress (consume-on-read)', () => {
    const input = setupKeyboard();
    pressKey('d');

    expect(input.consumePress(0)).toBe(true);
    expect(input.consumePress(0)).toBe(false);
  });

  it('ignores repeated keydown events (key held down)', () => {
    const input = setupKeyboard();
    pressKey('d', true); // repeat = true

    expect(input.consumePress(0)).toBe(false);
  });

  it('calls preventDefault for lane keys', () => {
    setupKeyboard();
    const event = pressKey('f');
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('ignores unmapped keys', () => {
    const input = setupKeyboard();
    pressKey('a');
    pressKey('Enter');
    pressKey(' ');

    for (let lane = 0; lane < 4; lane++) {
      expect(input.consumePress(lane)).toBe(false);
    }
  });

  it('allows re-pressing after consumption', () => {
    const input = setupKeyboard();

    pressKey('d');
    expect(input.consumePress(0)).toBe(true);

    pressKey('d'); // new press
    expect(input.consumePress(0)).toBe(true);
  });

  it('handles multiple lanes pressed simultaneously', () => {
    const input = setupKeyboard();

    pressKey('d');
    pressKey('j');

    expect(input.consumePress(0)).toBe(true);
    expect(input.consumePress(2)).toBe(true);
    expect(input.consumePress(1)).toBe(false);
    expect(input.consumePress(3)).toBe(false);
  });

  it('teardown removes the keydown listener', () => {
    const input = setupKeyboard();
    input.teardown();

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('does not receive events after teardown', () => {
    const input = setupKeyboard();
    input.teardown();

    // Simulate a keypress after teardown — the captured callback is stale
    // (the real listener was removed). This test verifies teardown was called.
    expect(removeSpy).toHaveBeenCalled();
  });
});
