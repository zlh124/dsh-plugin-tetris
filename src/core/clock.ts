/**
 * Time seam.
 *
 * Upstream reads wall-clock time via `datetime.now(UTC)` (game clock, Time
 * Attack, pause accounting) and `time.time()` (notice expiry). Both are
 * unified here behind a millisecond clock so the ported tests can freeze and
 * advance time deterministically instead of monkeypatching `datetime`.
 */

export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

/** Manually advanced clock for tests. */
export class FakeClock implements Clock {
  private current: number;

  constructor(startMs = 0) {
    this.current = startMs;
  }

  now(): number {
    return this.current;
  }

  /** Advance the clock by `seconds`. */
  advance(seconds: number): void {
    this.current += seconds * 1000;
  }
}
