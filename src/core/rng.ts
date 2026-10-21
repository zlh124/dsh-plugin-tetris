/**
 * Randomness seam.
 *
 * Upstream uses the `random` module with an optional `seed=` argument
 * (`random.seed`, `random.shuffle`, `random.randint`). The exact Python
 * sequence is NOT reproduced — tests that need determinism inject their own
 * {@link Rng} — but the seam keeps the same three capabilities so the ported
 * test suite can control randomness the way it did with `monkeypatch`.
 */

export interface Rng {
  /** In-place Fisher-Yates shuffle. */
  shuffle<T>(items: T[]): void;
  /** Inclusive integer in `[min, max]`, mirroring `random.randint`. */
  randint(min: number, max: number): number;
}

/** Deterministic 32-bit PRNG (mulberry32). */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    shuffle<T>(items: T[]): void {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
      }
    },
    randint(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}

/** Non-deterministic RNG backed by `Math.random`. */
export const systemRng: Rng = {
  shuffle<T>(items: T[]): void {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
  },
  randint(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  },
};
