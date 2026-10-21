/**
 * Configuration container.
 *
 * Ported from `tetris-terminal/src/tetris/config.py` (MIT, by jayzhu).
 * Only the fields the engine and the browser UI actually read are carried
 * over; logging / multiplayer / terminal-display geometry are dropped, and
 * defaults are kept identical to upstream.
 */

/** Gameplay rule parameters. */
export interface GameRulesConfig {
  /** Number of columns in the playfield. */
  boardWidth: number;
  /** Total rows (including the 20-row buffer zone). */
  boardHeight: number;
  /** Max moves/rotates before forced lock-down. */
  maxLockDownMoveCount: number;
  /** Duration in seconds for Time Attack mode. */
  timeAttackDuration: number;
}

/** Frame rate and animation timing settings. */
export interface TimingConfig {
  /** Target frames per second for rendering. */
  fps: number;
  /** Seconds between line-clear flash toggles. */
  clearAnimFlashInterval: number;
  /** Total duration of the line-clear animation. */
  clearAnimDuration: number;
}

/** Root configuration container. */
export interface Config {
  gameRules: GameRulesConfig;
  timing: TimingConfig;
}

/** Upstream `Config()` defaults. */
export function defaultConfig(): Config {
  return {
    gameRules: {
      boardWidth: 10,
      boardHeight: 40,
      maxLockDownMoveCount: 15,
      timeAttackDuration: 120,
    },
    timing: {
      fps: 30,
      clearAnimFlashInterval: 0.05,
      clearAnimDuration: 0.3,
    },
  };
}
