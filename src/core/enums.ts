/**
 * Enumerations used throughout the Tetris engine.
 *
 * Ported 1:1 from `tetris-terminal/src/tetris/enums.py` (MIT, by jayzhu).
 * Numeric values are part of the contract: they index colour pairs and the
 * board cells store `TetriminoShape` values directly.
 */

/** Tetrimino piece identifier (matches standard Tetris piece numbering). */
export enum TetriminoShape {
  EMPTY = 0,
  Z = 1,
  S = 2,
  O = 3,
  J = 4,
  T = 5,
  I = 6,
  L = 7,
  /** Garbage Tetrimino */
  GARBAGE = 8,
  /** Cells in rows pending line-clear animation */
  CLEAR = 9,
}

/** The seven standard tetriminos (excluding EMPTY, GARBAGE and CLEAR). */
export const NORMAL_TETRIMINOS: readonly TetriminoShape[] = [
  TetriminoShape.Z,
  TetriminoShape.S,
  TetriminoShape.O,
  TetriminoShape.J,
  TetriminoShape.T,
  TetriminoShape.I,
  TetriminoShape.L,
];

/**
 * Cardinal direction (clockwise from NORTH).
 *
 * Python's `Direction` is an `IntFlag`-style `IntEnum` with bit values; the
 * numeric values are preserved because `ROTATE_TABLE` is keyed by them.
 */
export enum Direction {
  NORTH = 0b0001,
  EAST = 0b0010,
  SOUTH = 0b0100,
  WEST = 0b1000,
}

/**
 * Definition order of `Direction`, mirroring Python's `list(Direction)`.
 *
 * NOTE: JavaScript numeric enums have reverse mappings, so `Object.values`
 * is NOT equivalent to Python's `list(Direction)`. Always use this array.
 */
export const DIRECTIONS: readonly Direction[] = [
  Direction.NORTH,
  Direction.EAST,
  Direction.SOUTH,
  Direction.WEST,
];

/** Game mode identifiers. */
export enum GameMode {
  /** 150-row challenge; game ends when lines >= 150. */
  LINES_150 = 0,
  /** Endless mode with level cap at 5. */
  CASUAL = 1,
  /** Endless mode with level cap at 15. */
  ENDLESS = 2,
  /** Digging mode with level cap at 5. */
  DIGGING = 3,
  /** Clear as many lines as possible in 2 minutes. */
  TIME_ATTACK = 4,
  /** 1v1 multiplayer battle. */
  VERSUS = 5,
}

/** Human-readable mode label, mirroring Python's `GameMode.__str__`. */
export function gameModeLabel(mode: GameMode): string {
  switch (mode) {
    case GameMode.LINES_150:
      return "150 LINES";
    case GameMode.CASUAL:
      return "CASUAL";
    case GameMode.ENDLESS:
      return "ENDLESS";
    case GameMode.DIGGING:
      return "DIGGING";
    case GameMode.TIME_ATTACK:
      return "TIME ATTACK";
    case GameMode.VERSUS:
      return "VERSUS";
  }
}
