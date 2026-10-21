/**
 * Canvas painters for the board, the hold slot and the next-piece preview.
 *
 * Geometry mirrors upstream's curses layout: the playfield is
 * `boardWidth x (boardHeight - 20)` visible cells, the buffer zone
 * (rows 0..19) is never shown, and the next/hold slots centre a shape using
 * `SHOW_OFFSET`.
 */

import { SHAPE_TABLE, SHOW_OFFSET } from "../core/constants.ts";
import type { TetrisCore } from "../core/core.ts";
import { TetriminoShape } from "../core/enums.ts";

/** Logical pixel size of one board cell. */
export const CELL = 22;

/** Upstream buffer zone height; rows below this index are the visible field. */
const BUFFER_ROWS = 20;

/** Colour per shape, matching upstream's `_init_color` palette. */
const SHAPE_COLOR: Readonly<Record<number, string>> = {
  [TetriminoShape.Z]: "#e5484d", // red
  [TetriminoShape.S]: "#30a46c", // green
  [TetriminoShape.O]: "#f5d90a", // yellow
  [TetriminoShape.J]: "#3e63dd", // blue
  [TetriminoShape.T]: "#8e4ec6", // purple
  [TetriminoShape.I]: "#00d5ff", // cyan
  [TetriminoShape.L]: "#f76b15", // orange
  [TetriminoShape.GARBAGE]: "#5b6472", // grey
  [TetriminoShape.CLEAR]: "#ffffff",
};

const EMPTY_CELL = "rgba(255,255,255,0.045)";
const GRID_LINE = "rgba(255,255,255,0.07)";

/** Size a canvas for the device pixel ratio and return its 2D context. */
function prepare(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(cssWidth * dpr);
  const pixelHeight = Math.round(cssHeight * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

/** Paint one cell with a subtle top-left highlight so blocks read as solid. */
function paintCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha = 1,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  ctx.globalAlpha = alpha * 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 1, y + 1, size - 2, Math.max(2, size * 0.16));
  ctx.globalAlpha = 1;
}

/** Paint a dimmed ghost outline for the shadow (ghost) piece. */
function paintGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
  ctx.globalAlpha = 1;
}

export interface BoardSize {
  width: number;
  height: number;
}

/** Logical size of the board canvas for a given core configuration. */
export function boardSize(core: TetrisCore): BoardSize {
  return {
    width: core.gameRules.boardWidth * CELL,
    height: (core.gameRules.boardHeight - BUFFER_ROWS) * CELL,
  };
}

/** Paint the playfield: settled cells, the flashing clear rows, ghost, piece. */
export function drawBoard(canvas: HTMLCanvasElement, core: TetrisCore): void {
  const visibleRows = core.gameRules.boardHeight - BUFFER_ROWS;
  const cols = core.gameRules.boardWidth;
  const width = cols * CELL;
  const height = visibleRows * CELL;
  const ctx = prepare(canvas, width, height);
  if (ctx === null) return;

  // Board background + grid.
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, height);
    ctx.stroke();
  }
  for (let r = 1; r < visibleRows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(width, r * CELL + 0.5);
    ctx.stroke();
  }

  // Rows pending the line-clear animation flash as a UNIT.
  //
  // Upstream drives every cell of a clearing row from the same colour choice:
  // the board cell, the shadow AND the just-locked piece are all painted with
  // `CLEAR` while the row flashes. Painting the piece with its own shape colour
  // (as this did) covers the flash, so the piece's cells in a clearing row sat
  // there unblinking.
  const clearingRows = new Set<number>();
  for (let row = BUFFER_ROWS; row < core.gameRules.boardHeight; row++) {
    if (core.board[row].some((v) => v === TetriminoShape.CLEAR)) {
      clearingRows.add(row);
    }
  }
  // `game_time // clear_anim_flash_interval % 2`, matching upstream's phase.
  const flashBright =
    Math.floor(core.gameTime / core.timing.clearAnimFlashInterval) % 2 === 1;
  const flashColor = "#ffffff";
  const flashAlpha = flashBright ? 0.95 : 0.22;
  const clearingPaint = (row: number, col: number): void => {
    paintCell(ctx, col * CELL, (row - BUFFER_ROWS) * CELL, CELL, flashColor, flashAlpha);
  };

  for (let row = BUFFER_ROWS; row < core.gameRules.boardHeight; row++) {
    const y = (row - BUFFER_ROWS) * CELL;
    for (let col = 0; col < cols; col++) {
      const cell = core.board[row][col];
      const x = col * CELL;
      if (cell === TetriminoShape.EMPTY) {
        ctx.fillStyle = EMPTY_CELL;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      } else if (cell === TetriminoShape.CLEAR) {
        clearingPaint(row, col);
      } else {
        paintCell(ctx, x, y, CELL, SHAPE_COLOR[cell] ?? "#888888");
      }
    }
  }

  const piece = core.curTetrimino;
  if (piece === null) return;
  const pieceColor = SHAPE_COLOR[piece.shape] ?? "#888888";

  // Shadow first, then the piece on top (upstream's draw order). Both switch
  // to the flashing colour when their row is being cleared.
  const pieceCells = new Set(piece.bodies.map(([r, c]) => `${r},${c}`));
  for (const [row, col] of core.shadow) {
    if (row < BUFFER_ROWS) continue;
    if (pieceCells.has(`${row},${col}`)) continue;
    if (clearingRows.has(row)) clearingPaint(row, col);
    else paintGhost(ctx, col * CELL, (row - BUFFER_ROWS) * CELL, CELL, pieceColor);
  }

  for (const [row, col] of piece.bodies) {
    if (row < BUFFER_ROWS) continue;
    if (clearingRows.has(row)) clearingPaint(row, col);
    else paintCell(ctx, col * CELL, (row - BUFFER_ROWS) * CELL, CELL, pieceColor);
  }
}

/**
 * Fixed logical size of one preview cell.
 *
 * ONE cell size for every preview: the same value draws the hold piece and
 * every next piece, so an O tetrimino is the same size on both sides. Sizing
 * each preview from its own bounding box (the earlier approach) made the same
 * piece render at 22px in the hold slot and 20px in a next slot.
 *
 * Derived from the square well: the widest piece is 4 cells across, so
 * `floor(73 / 4) = 18` is the largest shared cell size that still fits every
 * piece inside a square interior.
 */
export const PREVIEW_CELL = 18;

/**
 * Fixed logical size of a preview slot's canvas — SQUARE.
 *
 * Five square wells have to fit the 440px playfield beside the label:
 * `14 (label) + 6 (gap) + 5*S + 4*4 (well gaps) = 440` gives S = 80, so the
 * interior is 73x73. The cell size below is derived from that.
 */
export const PREVIEW_SIZE = 73;

/** Logical size of a square preview well, including padding and border. */
export const SLOT_SIZE = PREVIEW_SIZE + 7;

/**
 * Paint one piece into a fixed-size square preview slot, centred.
 *
 * `SHOW_OFFSET` is applied first, exactly as upstream's preview/hold windows
 * do, so every piece is normalised into the same anchor (its cells land at
 * non-negative rows) before anything is measured. The resulting bounds are
 * then centred inside the slot, which is what makes each piece sit in the
 * middle of its well rather than hugging one corner.
 *
 * `shape === null` clears the slot (an empty hold, or a next slot the bag has
 * not filled yet).
 */
export function drawPreview(
  canvas: HTMLCanvasElement,
  shape: TetriminoShape | null,
  alpha = 1,
): void {
  const ctx = prepare(canvas, PREVIEW_SIZE, PREVIEW_SIZE);
  if (ctx === null || shape === null) return;
  const cells = SHAPE_TABLE[shape];
  if (cells.length === 0) return;

  const [dx, dy] = SHOW_OFFSET[shape];
  const shifted = cells.map(([r, c]) => [r + dx, c + dy] as const);

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const [r, c] of shifted) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const width = (maxC - minC + 1) * PREVIEW_CELL;
  const height = (maxR - minR + 1) * PREVIEW_CELL;
  const offsetX = Math.round((PREVIEW_SIZE - width) / 2);
  const offsetY = Math.round((PREVIEW_SIZE - height) / 2);
  const color = SHAPE_COLOR[shape] ?? "#888888";

  for (const [r, c] of shifted) {
    paintCell(
      ctx,
      offsetX + (c - minC) * PREVIEW_CELL,
      offsetY + (r - minR) * PREVIEW_CELL,
      PREVIEW_CELL,
      color,
      alpha,
    );
  }
}

/** Colour for one shape, for use in non-canvas chrome (e.g. small chips). */
export function shapeColor(shape: TetriminoShape): string {
  return SHAPE_COLOR[shape] ?? "#888888";
}
