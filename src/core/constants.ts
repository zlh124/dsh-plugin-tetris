/**
 * Constants and lookup tables for the Tetris engine.
 *
 * Ported 1:1 from `tetris-terminal/src/tetris/constants.py` (MIT, by jayzhu).
 *
 * The `ROTATE_TABLE` is built by the SAME stateful algorithm as upstream
 * (`cur_pos` accumulates across the eight direction transitions, in order),
 * because the stored value is a per-transition *delta*, not an absolute cell
 * list. Do not replace this with a hand-copied table.
 */

import { DIRECTIONS, Direction, NORMAL_TETRIMINOS, TetriminoShape } from "./enums.ts";

export type Point = readonly [number, number];

/** Either a `[row, col]` axis or a double axis `[[r0, r1], [c0, c1]]` (I / O). */
export type RotateAxis = Point | readonly [Point, Point];

// ---------------------------------------------------------------------------
// Tetrimino shapes — cells relative to the standard rotation centre
// ---------------------------------------------------------------------------

export const SHAPE_TABLE: Readonly<Record<TetriminoShape, readonly Point[]>> = {
  [TetriminoShape.EMPTY]: [],
  [TetriminoShape.Z]: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [TetriminoShape.S]: [
    [0, 0],
    [0, 1],
    [-1, 1],
    [-1, 2],
  ],
  [TetriminoShape.O]: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [TetriminoShape.J]: [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  [TetriminoShape.T]: [
    [0, 0],
    [0, 1],
    [-1, 1],
    [0, 2],
  ],
  [TetriminoShape.I]: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [TetriminoShape.L]: [
    [0, 0],
    [0, 1],
    [0, 2],
    [-1, 2],
  ],
  [TetriminoShape.GARBAGE]: [],
  [TetriminoShape.CLEAR]: [],
};

/**
 * Standard rotation axis, from the first cell of the shape table.
 * The I and O pieces use a double-axis midpoint.
 */
export const ROTATE_AXIS: Readonly<Record<TetriminoShape, RotateAxis>> = {
  [TetriminoShape.EMPTY]: [0, 0],
  [TetriminoShape.Z]: [1, 1],
  [TetriminoShape.S]: [0, 1],
  [TetriminoShape.O]: [
    [0, 1],
    [0, 1],
  ],
  [TetriminoShape.J]: [1, 1],
  [TetriminoShape.T]: [0, 1],
  [TetriminoShape.I]: [
    [0, 1],
    [1, 2],
  ],
  [TetriminoShape.L]: [0, 1],
  [TetriminoShape.GARBAGE]: [0, 0],
  [TetriminoShape.CLEAR]: [0, 0],
};

/** Drawing offsets for the preview / hold windows so each piece is centred. */
export const SHOW_OFFSET: Readonly<Record<TetriminoShape, Point>> = {
  [TetriminoShape.EMPTY]: [0, 0],
  [TetriminoShape.Z]: [1, 0],
  [TetriminoShape.S]: [2, 0],
  [TetriminoShape.O]: [1, 0],
  [TetriminoShape.J]: [1, 0],
  [TetriminoShape.T]: [2, 0],
  [TetriminoShape.I]: [1, 0],
  [TetriminoShape.L]: [2, 0],
  [TetriminoShape.GARBAGE]: [0, 0],
  [TetriminoShape.CLEAR]: [0, 0],
};

/** Spawn positions in the board `[row, col]` — top of the buffer zone. */
export const GENERATE_POSITION: Readonly<Record<TetriminoShape, Point>> = {
  [TetriminoShape.EMPTY]: [0, 0],
  [TetriminoShape.Z]: [18, 3],
  [TetriminoShape.S]: [19, 3],
  [TetriminoShape.O]: [18, 4],
  [TetriminoShape.J]: [18, 3],
  [TetriminoShape.T]: [19, 3],
  [TetriminoShape.I]: [19, 3],
  [TetriminoShape.L]: [19, 3],
  [TetriminoShape.GARBAGE]: [0, 0],
  [TetriminoShape.CLEAR]: [0, 0],
};

// ---------------------------------------------------------------------------
// SRS wall-kick offset tables
// ---------------------------------------------------------------------------

const JLSTZ_WALL_KICK_OFFSET: Readonly<Record<string, readonly Point[]>> = {
  "1,2": [
    [0, 0],
    [0, -1],
    [-1, -1],
    [2, 0],
    [2, -1],
  ], // N->E
  "2,1": [
    [0, 0],
    [0, 1],
    [1, 1],
    [-2, 0],
    [-2, 1],
  ], // E->N
  "2,4": [
    [0, 0],
    [0, 1],
    [1, 1],
    [-2, 0],
    [-2, 1],
  ], // E->S
  "4,2": [
    [0, 0],
    [0, -1],
    [-1, -1],
    [2, 0],
    [2, -1],
  ], // S->E
  "4,8": [
    [0, 0],
    [0, 1],
    [-1, 1],
    [2, 0],
    [2, 1],
  ], // S->W
  "8,4": [
    [0, 0],
    [0, -1],
    [1, -1],
    [-2, 0],
    [-2, -1],
  ], // W->S
  "8,1": [
    [0, 0],
    [0, -1],
    [1, -1],
    [-2, 0],
    [-2, -1],
  ], // W->N
  "1,8": [
    [0, 0],
    [0, 1],
    [-1, 1],
    [2, 0],
    [2, 1],
  ], // N->W
};

const O_WALL_KICK_OFFSET: Readonly<Record<string, readonly Point[]>> = {
  "1,2": [[0, 0]],
  "2,1": [[0, 0]],
  "2,4": [[0, 0]],
  "4,2": [[0, 0]],
  "4,8": [[0, 0]],
  "8,4": [[0, 0]],
  "8,1": [[0, 0]],
  "1,8": [[0, 0]],
};

const I_WALL_KICK_OFFSET: Readonly<Record<string, readonly Point[]>> = {
  "1,2": [
    [0, 0],
    [0, -2],
    [0, 1],
    [1, -2],
    [-2, 1],
  ], // N->E
  "2,1": [
    [0, 0],
    [0, 2],
    [0, -1],
    [-1, 2],
    [2, -1],
  ], // E->N
  "2,4": [
    [0, 0],
    [0, -1],
    [0, 2],
    [-2, -1],
    [1, 2],
  ], // E->S
  "4,2": [
    [0, 0],
    [0, 1],
    [0, -2],
    [2, 1],
    [-1, -2],
  ], // S->E
  "4,8": [
    [0, 0],
    [0, 2],
    [0, -1],
    [-1, 2],
    [2, -1],
  ], // S->W
  "8,4": [
    [0, 0],
    [0, -2],
    [0, 1],
    [1, -2],
    [-2, 1],
  ], // W->S
  "8,1": [
    [0, 0],
    [0, 1],
    [0, -2],
    [2, 1],
    [-1, -2],
  ], // W->N
  "1,8": [
    [0, 0],
    [0, -1],
    [0, 2],
    [-2, -1],
    [1, 2],
  ], // N->W
};

/** Key for a direction transition in the rotation tables. */
export function rotationKey(start: Direction, end: Direction): string {
  return `${start},${end}`;
}

/**
 * Rotate a list of `(row, col)` points by 90 degrees around a center.
 *
 * Mirrors upstream's `int()` truncation exactly: Python truncates toward
 * zero, so `Math.trunc` is required here (`Math.round`/`~~` would differ on
 * the half-integer coordinates produced by the I / O double axes).
 */
export function rotatePoints(
  points: readonly Point[],
  center: RotateAxis,
  ccw = false,
): Point[] {
  let cr: number;
  let cc: number;
  if (typeof center[0] === "number") {
    const axis = center as Point;
    cr = axis[0];
    cc = axis[1];
  } else {
    const [rows, cols] = center as readonly [Point, Point];
    cr = (rows[0] + rows[1]) / 2.0;
    cc = (cols[0] + cols[1]) / 2.0;
  }

  const out: Point[] = [];
  for (const [r, c] of points) {
    const relR = r - cr;
    const relC = c - cc;
    const newRelR = ccw ? -relC : relC;
    const newRelC = ccw ? relR : -relR;
    out.push([Math.trunc(newRelR + cr), Math.trunc(newRelC + cc)]);
  }
  return out;
}

/** One rotation-table entry: the delta plus the wall-kick offsets to try. */
export interface RotateEntry {
  readonly standardRotateDiff: readonly Point[];
  readonly offsets: readonly Point[];
}

const ROTATE_TABLE: Map<TetriminoShape, Map<string, RotateEntry>> = new Map();

for (const shape of NORMAL_TETRIMINOS) {
  const dirs = DIRECTIONS;
  const cw: Array<readonly [Direction, Direction, boolean]> = [];
  for (let i = 0; i < dirs.length; i++) {
    cw.push([dirs[i], dirs[(i + 1) % dirs.length], false]);
  }
  // Python: `for i in range(0, -len(directions), -1)` → i = 0, -1, -2, -3,
  // with `directions[i]` using Python's negative indexing.
  const ccwTransitions: Array<readonly [Direction, Direction, boolean]> = [];
  for (let i = 0; i < dirs.length; i++) {
    const idx = -i;
    const start = dirs[((idx % dirs.length) + dirs.length) % dirs.length];
    const endIdx = ((dirs.length + (idx - 1)) % dirs.length + dirs.length) % dirs.length;
    ccwTransitions.push([start, dirs[endIdx], true]);
  }

  let curPos: Point[] = SHAPE_TABLE[shape].map((p) => [p[0], p[1]] as Point);
  const table = new Map<string, RotateEntry>();
  ROTATE_TABLE.set(shape, table);

  for (const [start, end, isCcw] of [...cw, ...ccwTransitions]) {
    const rotated = rotatePoints(curPos, ROTATE_AXIS[shape], isCcw);
    const diff: Point[] = rotated.map(([rx, ry], i) => [
      rx - curPos[i][0],
      ry - curPos[i][1],
    ]);
    curPos = rotated;

    const key = rotationKey(start, end);
    const offsets =
      shape === TetriminoShape.I
        ? I_WALL_KICK_OFFSET[key]
        : shape === TetriminoShape.O
          ? O_WALL_KICK_OFFSET[key]
          : JLSTZ_WALL_KICK_OFFSET[key];

    table.set(key, { standardRotateDiff: diff, offsets });
  }
}

/** Look up the rotation-table entry for one shape and direction transition. */
export function rotationEntry(
  shape: TetriminoShape,
  start: Direction,
  end: Direction,
): RotateEntry | undefined {
  return ROTATE_TABLE.get(shape)?.get(rotationKey(start, end));
}
