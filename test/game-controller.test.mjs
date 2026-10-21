/**
 * Controller tests for the fixed-timestep loop.
 *
 * These run without a browser: Node has `performance` but no
 * `requestAnimationFrame`, so the two frame functions are stubbed with timers.
 * That is enough to exercise the loop's actual lifetime rules, which is where
 * the "a restarted game no longer falls" bug lived.
 */

import assert from "node:assert/strict";
import { test, before, after } from "node:test";

import { TetrisGame, actionForKey, isGameKey } from "../src/client/game.ts";
import { GameMode } from "../src/core/enums.ts";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Topmost row of the active piece; the piece falls toward larger rows. */
function pieceTopRow(game) {
  return Math.min(...game.core.curTetrimino.bodies.map(([row]) => row));
}

before(() => {
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 1);
  globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
});

after(async () => {
  // Let any frame a test scheduled drain before the stubs disappear; a pending
  // frame firing after teardown would surface as an uncaughtReferenceError.
  await wait(30);
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

test("start() and stop() drive the loop flag", () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  assert.equal(game.isRunning, false);
  game.start();
  assert.equal(game.isRunning, true);
  game.start(); // idempotent
  assert.equal(game.isRunning, true);
  game.stop();
  assert.equal(game.isRunning, false);
  game.stop(); // idempotent
  assert.equal(game.isRunning, false);
  game.stop();
});

test("reset() keeps a running game running", () => {
  // Regression: reset() stopped the loop and never restarted it, so the new
  // piece never fell and the ghost never appeared.
  const game = new TetrisGame(GameMode.ENDLESS);
  game.start();
  assert.equal(game.isRunning, true);
  game.reset();
  assert.equal(game.isRunning, true, "reset must leave the loop running");
  assert.equal(game.outcome, null);
  game.stop();
});

test("reset() restarts the loop after a game over", async () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  game.start();
  game.core.forcedGameOver("game over!");
  assert.notEqual(game.outcome, null, "the game should be over");
  assert.equal(game.isRunning, false, "game over stops the loop");

  game.reset();
  assert.equal(game.outcome, null);
  assert.equal(game.isRunning, true, "a new game must fall again");
  game.stop();
});

test("a reset game really falls and projects a shadow", async () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  game.start();
  game.core.forcedGameOver("game over!");
  game.reset();

  // `process()` is what drives both gravity and `_handleShadow`, so an empty
  // shadow is the fingerprint of a loop that never restarted.
  await wait(120);
  assert.equal(
    game.core.shadow.length,
    4,
    "the new game must project a shadow piece",
  );

  const before = pieceTopRow(game);
  await wait(1400);
  const after = pieceTopRow(game);
  assert.ok(
    after > before,
    `the piece must fall (top row ${before} -> ${after})`,
  );
  game.stop();
});

test("reset() clears the previous outcome and score", () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  game.core.score = 1234;
  game.core.forcedGameOver("game over!");
  game.reset();
  assert.equal(game.core.score, 0);
  assert.equal(game.outcome, null);
  assert.equal(game.core.lines, 0);
  // reset() always restarts the loop, so this test owns stopping it.
  game.stop();
});

test("nextShapes reports the upcoming pieces, capped at the bag", () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  assert.equal(game.nextShapes(5).length, 5);
  assert.equal(game.nextShapes(1).length, 1);
  assert.equal(game.nextShapes(99).length <= 13, true);
});

test("keyboard bindings cover the documented controls", () => {
  assert.equal(actionForKey("ArrowLeft"), "left");
  assert.equal(actionForKey("a"), "left");
  assert.equal(actionForKey("d"), "right");
  assert.equal(actionForKey("ArrowUp"), "rotateCw");
  assert.equal(actionForKey("x"), "rotateCw");
  assert.equal(actionForKey("z"), "rotateCcw");
  assert.equal(actionForKey("ArrowDown"), "softDrop");
  assert.equal(actionForKey(" "), "hardDrop");
  assert.equal(actionForKey("c"), "hold");
  assert.equal(actionForKey("p"), "pause");
  // No quit hotkey: the Web panel restarts/closes with buttons.
  assert.equal(actionForKey("q"), undefined);
  assert.equal(isGameKey("q"), false);
  // Unbound keys must fall through so the composer keeps them.
  assert.equal(actionForKey("Enter"), undefined);
  assert.equal(isGameKey("Enter"), false);
  assert.equal(isGameKey(" "), true);
});

test("dispatching a control reaches the engine", () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  const column = () =>
    Math.min(...game.core.curTetrimino.bodies.map(([, c]) => c));
  const startColumn = column();

  game.dispatch("left");
  assert.equal(column(), startColumn - 1, "one cell to the left");
  game.dispatch("right");
  assert.equal(column(), startColumn, "and back again");

  // Rotation is checked on its own: turning the piece legitimately changes
  // which columns it occupies.
  game.dispatch("rotateCw");
  assert.equal(game.core.curTetrimino.direction, 2, "one clockwise turn");
});

test("pausing requests an explicit state, never a blind toggle", () => {
  const game = new TetrisGame(GameMode.ENDLESS);
  game.setPaused(true);
  assert.equal(game.core.paused, true);
  game.setPaused(true);
  assert.equal(game.core.paused, true, "a repeated pause must not resume");
  game.setPaused(false);
  assert.equal(game.core.paused, false);
  game.setPaused(false);
  assert.equal(game.core.paused, false, "a repeated resume must not pause");
});
