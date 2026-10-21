/**
 * Drawing tests for the canvas painters.
 *
 * There is no browser here, so a recording 2D context stands in for the real
 * one. This exercises the paint paths end to end — including the buffer-zone
 * clipping and the visible-cell maths — without needing a DOM.
 */

import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, before, after } from "node:test";

import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, ".test-build-render");
const outFile = resolve(outDir, "render.mjs");

let render;

/** A 2D context that records the rectangles it was asked to paint. */
function recordingContext() {
  const rects = [];
  // Track the current translation so stacked previews record absolute
  // positions (the real context applies the transform; this one records it).
  let tx = 0;
  let ty = 0;
  const stack = [];
  const ctx = {
    rects,
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    setTransform() {},
    clearRect() {},
    save() {
      stack.push([tx, ty]);
    },
    restore() {
      const previous = stack.pop();
      if (previous !== undefined) {
        tx = previous[0];
        ty = previous[1];
      }
    },
    translate(dx, dy) {
      tx += dx;
      ty += dy;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    strokeRect() {},
    fillRect(x, y, w, h) {
      rects.push({
        x: x + tx,
        y: y + ty,
        w,
        h,
        color: ctx.fillStyle,
        alpha: ctx.globalAlpha,
      });
    },
  };
  return ctx;
}

function fakeCanvas(ctx) {
  return {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
  };
}

before(async () => {
  await mkdir(outDir, { recursive: true });
  await build({
    entryPoints: [resolve(root, "src/client/render.ts")],
    outfile: outFile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    logLevel: "warning",
  });
  render = await import(pathToFileURL(outFile).href);
  globalThis.window = { devicePixelRatio: 1 };
});

after(async () => {
  delete globalThis.window;
  await rm(outDir, { recursive: true, force: true });
});

/**
 * `src/core/*.ts` uses `enum`, which Node's plain type stripping cannot run, so
 * these tests build the core alongside the painter when they need it.
 */
async function loadCore() {
  const coreOut = resolve(outDir, "core.mjs");
  await build({
    entryPoints: [resolve(root, "src/core/core.ts")],
    outfile: coreOut,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    logLevel: "warning",
  });
  const enumsOut = resolve(outDir, "enums.mjs");
  await build({
    entryPoints: [resolve(root, "src/core/enums.ts")],
    outfile: enumsOut,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    logLevel: "warning",
  });
  const clockOut = resolve(outDir, "clock.mjs");
  await build({
    entryPoints: [resolve(root, "src/core/clock.ts")],
    outfile: clockOut,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    logLevel: "warning",
  });
  return {
    core: await import(pathToFileURL(coreOut).href),
    enums: await import(pathToFileURL(enumsOut).href),
    clock: await import(pathToFileURL(clockOut).href),
  };
}

test("boardSize covers exactly the visible rows", async () => {
  const { core: coreMod, enums } = await loadCore();
  const game = new coreMod.TetrisCore({ gameMode: enums.GameMode.ENDLESS, seed: 3 });
  const size = render.boardSize(game);
  assert.equal(size.width, 10 * render.CELL);
  assert.equal(size.height, 20 * render.CELL, "buffer zone rows must not be painted");
});

test("drawBoard paints the settled cells but never the buffer zone", async () => {
  const { core: coreMod, enums } = await loadCore();
  const game = new coreMod.TetrisCore({ gameMode: enums.GameMode.ENDLESS, seed: 3 });

  // Block a visible cell and a buffer-zone cell.
  game.board[39][0] = enums.TetriminoShape.Z;
  game.board[5][0] = enums.TetriminoShape.Z;
  // Park the active piece fully inside the buffer zone so it is not painted.
  const piece = new coreMod.Tetrimino(enums.TetriminoShape.T);
  piece.bodies = [
    [5, 4],
    [5, 5],
    [4, 5],
    [5, 6],
  ];
  game.curTetrimino = piece;
  game.shadow = [];

  const ctx = recordingContext();
  render.drawBoard(fakeCanvas(ctx), game);

  // Cells are painted with a 1px inset inside their CELL-sized box.
  const cells = ctx.rects.filter((r) => r.w === render.CELL - 2);
  const bottomRowY = 19 * render.CELL + 1;
  const settled = cells.filter((r) => r.color === "#e5484d");
  assert.equal(settled.length, 1, "exactly the visible settled cell is painted");
  assert.equal(settled[0].y, bottomRowY);
  assert.equal(settled[0].x, 1); // column 0, plus the 1px inset

  // Nothing may be painted for the buffer-zone cell (row 5 would be y < 0).
  for (const r of cells) {
    assert.ok(r.y >= 0, `painted a buffer-zone cell at y=${r.y}`);
  }
});

test("drawBoard paints the active piece and its ghost separately", async () => {
  const { core: coreMod, enums } = await loadCore();
  const game = new coreMod.TetrisCore({ gameMode: enums.GameMode.ENDLESS, seed: 3 });
  const piece = new coreMod.Tetrimino(enums.TetriminoShape.I);
  piece.bodies = [
    [20, 3],
    [20, 4],
    [20, 5],
    [20, 6],
  ];
  game.curTetrimino = piece;
  game.shadow = [
    [39, 3],
    [39, 4],
    [39, 5],
    [39, 6],
  ];

  const ctx = recordingContext();
  render.drawBoard(fakeCanvas(ctx), game);

  // Row 20 is the first visible row, so its cells sit at y === 1.
  const pieceCells = ctx.rects.filter(
    (r) => r.alpha === 1 && r.color === "#00d5ff" && r.w === render.CELL - 2,
  );
  assert.equal(pieceCells.length, 4, "the I piece's four cells should be opaque");
  for (const cell of pieceCells) assert.equal(cell.y, 1);

  const ghostCells = ctx.rects.filter((r) => r.alpha === 0.22);
  assert.equal(ghostCells.length, 4, "the ghost should be painted translucent");
});

test("drawPreview paints all four cells of a piece at the fixed cell size", async () => {
  const { enums } = await loadCore();
  const shapes = [
    enums.TetriminoShape.I,
    enums.TetriminoShape.O,
    enums.TetriminoShape.T,
    enums.TetriminoShape.S,
    enums.TetriminoShape.Z,
    enums.TetriminoShape.J,
    enums.TetriminoShape.L,
  ];
  for (const shape of shapes) {
    const ctx = recordingContext();
    render.drawPreview(fakeCanvas(ctx), shape);
    const cells = ctx.rects.filter((r) => r.alpha === 1);
    assert.equal(cells.length, 4, `shape ${shape} should paint four cells`);
    for (const cell of cells) {
      assert.equal(
        cell.w,
        render.PREVIEW_CELL - 2,
        `shape ${shape} painted a cell at the wrong size`,
      );
      assert.equal(cell.h, render.PREVIEW_CELL - 2);
    }
  }
});

test("the same piece is the same size in the hold slot and in a next slot", async () => {
  // Regression: previews used to be sized from each box, so an O piece drew at
  // 22px in the hold slot and 20px in a next slot.
  const { enums } = await loadCore();
  for (const shape of [enums.TetriminoShape.O, enums.TetriminoShape.I]) {
    const holdCtx = recordingContext();
    render.drawPreview(fakeCanvas(holdCtx), shape);
    const nextCtx = recordingContext();
    render.drawPreview(fakeCanvas(nextCtx), shape);

    const size = (ctx) => ctx.rects.filter((r) => r.alpha === 1).map((r) => `${r.w}x${r.h}`);
    assert.deepEqual(
      size(holdCtx).sort(),
      size(nextCtx).sort(),
      `shape ${shape} must render identically in both slot kinds`,
    );
    // And a piece must be the same size as any other piece's cells.
    for (const rect of holdCtx.rects.filter((r) => r.alpha === 1)) {
      assert.equal(rect.w, render.PREVIEW_CELL - 2);
      assert.equal(rect.h, render.PREVIEW_CELL - 2);
    }
  }
});

test("drawPreview centres the piece inside the fixed slot", async () => {
  const { enums } = await loadCore();
  for (const shape of [
    enums.TetriminoShape.I,
    enums.TetriminoShape.O,
    enums.TetriminoShape.T,
  ]) {
    const ctx = recordingContext();
    render.drawPreview(fakeCanvas(ctx), shape);
    const cells = ctx.rects.filter((r) => r.alpha === 1);

    const left = Math.min(...cells.map((r) => r.x));
    const right = Math.max(...cells.map((r) => r.x + r.w));
    const top = Math.min(...cells.map((r) => r.y));
    const bottom = Math.max(...cells.map((r) => r.y + r.h));

    const slackX = render.PREVIEW_SIZE - (right - left);
    const slackY = render.PREVIEW_SIZE - (bottom - top);
    assert.ok(
      Math.abs(left - slackX / 2) <= 1,
      `shape ${shape} is not horizontally centred (left=${left}, slack=${slackX})`,
    );
    assert.ok(
      Math.abs(top - slackY / 2) <= 1,
      `shape ${shape} is not vertically centred (top=${top}, slack=${slackY})`,
    );
  }
});

test("an empty preview slot is cleared and paints nothing", async () => {
  const ctx = recordingContext();
  render.drawPreview(fakeCanvas(ctx), null);
  assert.equal(ctx.rects.length, 0);
});

test("a clearing row flashes underneath the locked piece too", async () => {
  // Regression: the just-locked piece was painted with its own shape colour
  // over the flash, so its cells in a clearing row never blinked. Upstream
  // paints the board cell, the shadow AND the piece with the CLEAR colour.
  const { core: coreMod, enums, clock: clockMod } = await loadCore();
  const clock = new clockMod.FakeClock(Date.UTC(2026, 0, 1));
  const game = new coreMod.TetrisCore({
    gameMode: enums.GameMode.ENDLESS,
    seed: 5,
    clock,
  });

  // The bottom row is mid line-clear animation...
  for (let col = 0; col < 10; col += 1) {
    game.board[39][col] = enums.TetriminoShape.CLEAR;
  }
  // ...and the piece that locked sits on it, which is the state the animation
  // renders (`curTetrimino` is not replaced until the animation finishes).
  const piece = new coreMod.Tetrimino(enums.TetriminoShape.O);
  piece.bodies = [
    [39, 3],
    [39, 4],
    [38, 3],
    [38, 4],
  ];
  game.curTetrimino = piece;
  game.shadow = [];

  // `paintCell` emits two fills per cell (body + highlight); the body is the
  // full-cell square, so match on height as well to isolate it. A clearing row
  // legitimately records two bodies per column: the board's CLEAR cell and the
  // piece drawn on top of it.
  const cellRects = (ctx, row, cols) =>
    ctx.rects.filter(
      (r) =>
        r.w === render.CELL - 2 &&
        r.h === render.CELL - 2 &&
        r.y === (row - 20) * render.CELL + 1 &&
        cols.includes((r.x - 1) / render.CELL),
    );

  const dimCtx = recordingContext();
  render.drawBoard(fakeCanvas(dimCtx), game);
  const dim = cellRects(dimCtx, 39, [3, 4]);
  assert.equal(
    dim.length,
    4,
    "two columns, each painted by the board's CLEAR cell and by the piece on top",
  );
  for (const rect of dim) {
    assert.equal(
      rect.color,
      "#ffffff",
      "a cell on a clearing row must use the flash colour, not the piece colour",
    );
    assert.equal(rect.alpha, 0.22, "dim half of the flash");
  }

  // The piece's cells on the row above are not being cleared: they keep their
  // own colour, so the flash is not over-applied.
  // Row 38 is not clearing: the piece keeps its own colour there. (Empty board
  // cells share the body dimensions, so match the piece colour explicitly.)
  const above = cellRects(dimCtx, 38, [3, 4]).filter((r) => r.color === "#f5d90a");
  assert.equal(
    above.length,
    2,
    "the O piece keeps its own colour off the clearing row",
  );

  // Half a flash interval later the whole row must be bright.
  clock.advance(game.timing.clearAnimFlashInterval);
  const brightCtx = recordingContext();
  render.drawBoard(fakeCanvas(brightCtx), game);
  for (const rect of cellRects(brightCtx, 39, [0, 3, 4, 9])) {
    assert.equal(rect.color, "#ffffff");
    assert.equal(rect.alpha, 0.95, "bright half of the flash");
  }
});

test("every preview piece fits inside the square slot", async () => {
  // Square wells mean a single shared cell size cannot fill both axes: a 4x1
  // piece fills the width and a 2x2 fills less. What must hold is that every
  // piece fits without clipping and uses the shared cell size.
  const { enums } = await loadCore();
  assert.equal(
    render.PREVIEW_SIZE,
    render.SLOT_SIZE - 7,
    "the well must be the canvas plus padding and border",
  );
  const shapes = [
    enums.TetriminoShape.I,
    enums.TetriminoShape.O,
    enums.TetriminoShape.T,
    enums.TetriminoShape.S,
    enums.TetriminoShape.Z,
    enums.TetriminoShape.J,
    enums.TetriminoShape.L,
  ];
  for (const shape of shapes) {
    const ctx = recordingContext();
    render.drawPreview(fakeCanvas(ctx), shape);
    const cells = ctx.rects.filter(
      (r) => r.alpha === 1 && r.h === render.PREVIEW_CELL - 2,
    );
    assert.equal(cells.length, 4, `shape ${shape} should paint four cells`);
    for (const cell of cells) {
      assert.equal(cell.w, render.PREVIEW_CELL - 2, "shared cell size");
    }
    const right = Math.max(...cells.map((r) => r.x + r.w));
    const bottom = Math.max(...cells.map((r) => r.y + r.h));
    const left = Math.min(...cells.map((r) => r.x));
    const top = Math.min(...cells.map((r) => r.y));
    assert.ok(left >= 0 && top >= 0, `shape ${shape} overflows the top-left`);
    assert.ok(
      right <= render.PREVIEW_SIZE && bottom <= render.PREVIEW_SIZE,
      `shape ${shape} overflows the bottom-right`,
    );
  }
});
