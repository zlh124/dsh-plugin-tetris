/**
 * TypeScript port of `tetris-terminal/tests/test_core.py`.
 *
 * This is a deliberate 1:1 port: every upstream `def test_*` becomes exactly
 * one `test(...)` (79 total). The upstream `@pytest.mark.parametrize` tables
 * are replayed with an inner loop inside the single corresponding test so the
 * count stays at one test per upstream function; every parametrised case still
 * asserts exactly what the pytest case asserted, and names the case in the
 * assertion message so a failure is attributable.
 *
 * Adaptations (behaviour-preserving):
 *   - `monkeypatch` on `tetris.core.datetime` / `tetris.core.time.time` is
 *     replaced by an injected `FakeClock`; the port routes BOTH the game clock
 *     and notice expiry through the injected clock, so advancing the fake clock
 *     replaces both monkeypatches.
 *   - `monkeypatch.setattr(core, "_x", fn)` becomes an instance property
 *     assignment through the `priv()` white-box accessor, because the ported
 *     tests are intentionally white-box.
 *   - `TetrisCore.Movement` is a module-private enum in the port (not
 *     exported), so its two values are referenced by number via the named
 *     constants `MOVEMENT_MOVE` / `MOVEMENT_ROTATE`.
 *   - `pytest.approx` is reproduced by `assertApprox`.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { FakeClock } from "../src/core/clock.ts";
import { defaultConfig } from "../src/core/config.ts";
import { Tetrimino, TetrisCore } from "../src/core/core.ts";
import {
  Direction,
  GameMode,
  NORMAL_TETRIMINOS,
  TetriminoShape,
} from "../src/core/enums.ts";

import type { Clock } from "../src/core/clock.ts";
import type { GameOverCallback, LockDownCallback } from "../src/core/core.ts";

// Board geometry (matches Config defaults).
const W = 10;
const H = 40;

/** White-box accessor: the ported upstream tests intentionally poke private members. */
type AnyCore = Record<string, any>;
const priv = (core: unknown): AnyCore => core as AnyCore;

/** Private `TetrisCore.Movement` enum values (MOVE = 0, ROTATE = 1). */
const MOVEMENT_MOVE = 0;
const MOVEMENT_ROTATE = 1;

/** Upstream's `frozen_clock` default start: `datetime(2026, 1, 1, tzinfo=UTC)`. */
const DEFAULT_START_MS = Date.UTC(2026, 0, 1);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * Build a core instance with no-op callbacks by default.
 *
 * Mirrors upstream `make_core(mode, seed=0, lock=None, over=None)`; the extra
 * `clock` parameter replaces upstream's `monkeypatch` of `datetime`/`time`.
 */
function makeCore(
  mode: GameMode = GameMode.ENDLESS,
  seed: number | null = 0,
  lock: LockDownCallback | null = null,
  over: GameOverCallback | null = null,
  clock?: Clock,
): TetrisCore {
  const lockCb: LockDownCallback = lock ?? (() => {});
  const overCb: GameOverCallback = over ?? (() => {});
  return new TetrisCore({
    gameMode: mode,
    config: defaultConfig(),
    lockDownCallback: lockCb,
    gameOverCallback: overCb,
    seed: seed === null ? undefined : seed,
    clock,
  });
}

/**
 * Inject a piece as the current tetrimino, bypassing the bag/spawn flow.
 *
 * Used for method-level isolation tests (rotation, collision, T-Spin).
 */
function setCurrent(
  core: TetrisCore,
  shape: TetriminoShape,
  bodies: ReadonlyArray<readonly [number, number]>,
  direction: Direction = Direction.NORTH,
): void {
  const t = new Tetrimino(shape);
  t.bodies = bodies.map(([r, c]) => [r, c] as [number, number]);
  t.direction = direction;
  core.curTetrimino = t;
}

/** Make the next `_generateNewTetrimino` produce *shape*. */
function forceNext(core: TetrisCore, shape: TetriminoShape): void {
  core.bag.appendleft(new Tetrimino(shape));
}

/** Mark board cells as occupied (assumes an already-empty board). */
function block(
  core: TetrisCore,
  cells: ReadonlyArray<readonly [number, number]>,
  shape: TetriminoShape = TetriminoShape.Z,
): void {
  for (const [r, c] of cells) core.board[r][c] = shape;
}

/** Sorted `"row,col"` keys — mirrors upstream's `set(map(tuple, bodies))`. */
function cellSet(bodies: ReadonlyArray<readonly [number, number]>): string[] {
  return bodies.map(([r, c]) => `${r},${c}`).sort();
}

/** Mirrors `pytest.approx` for the elapsed-time assertions. */
function assertApprox(actual: number, expected: number, message?: string): void {
  const tolerance = 1e-6 * Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    message ?? `expected ${actual} to be approximately ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// 7-bag randomiser
// ---------------------------------------------------------------------------

describe("TestBag", () => {
  /** Tests for the 7-bag tetrimino generator. */

  test("test_bag_cycle_has_all_seven", () => {
    // One bag cycle contains exactly one of each standard shape.
    //
    // The first cycle is `cur_tetrimino` (popped at init) plus the next six
    // pieces still in the bag.
    const core = makeCore(GameMode.ENDLESS, 1);
    assert.ok(core.curTetrimino, "curTetrimino is null");
    const drawn = [
      core.curTetrimino.shape,
      ...Array.from({ length: 6 }, () => core.bag.popleft().shape),
    ];
    assert.deepEqual(
      [...drawn].sort((a, b) => a - b),
      [...NORMAL_TETRIMINOS].sort((a, b) => a - b),
    );
  });

  test("test_bag_replenishes_at_seven", () => {
    // `_get_tetrimino` refills the bag when it drops to 7 pieces.
    const core = makeCore(GameMode.ENDLESS, 1);
    // Bag starts at 13 (one piece already spawned). Drawing 6 leaves 7,
    // which triggers a refill back to 14.
    for (let i = 0; i < 6; i++) priv(core)._getTetrimino();
    assert.equal(core.bag.length, 14);
  });

  test("test_same_seed_same_sequence", () => {
    // Two cores with the same seed produce identical piece sequences.
    //
    // Upstream seeds the *global* `random` module, so the second core must be
    // created *after* the first's sequence is fully drawn. The port gives each
    // core its own seeded RNG, so the same interleaving is used here anyway.
    const a = makeCore(GameMode.ENDLESS, 42);
    assert.ok(a.curTetrimino, "curTetrimino is null");
    const seqA = [
      a.curTetrimino.shape,
      ...Array.from({ length: 20 }, () => priv(a)._getTetrimino().shape),
    ];
    const b = makeCore(GameMode.ENDLESS, 42);
    assert.ok(b.curTetrimino, "curTetrimino is null");
    const seqB = [
      b.curTetrimino.shape,
      ...Array.from({ length: 20 }, () => priv(b)._getTetrimino().shape),
    ];
    assert.deepEqual(seqA, seqB);
  });

  test("test_different_seed_different_sequence", () => {
    // Different seeds (almost surely) produce different sequences.
    const a = makeCore(GameMode.ENDLESS, 1);
    assert.ok(a.curTetrimino, "curTetrimino is null");
    const seqA = [
      a.curTetrimino.shape,
      ...Array.from({ length: 20 }, () => priv(a)._getTetrimino().shape),
    ];
    const b = makeCore(GameMode.ENDLESS, 2);
    assert.ok(b.curTetrimino, "curTetrimino is null");
    const seqB = [
      b.curTetrimino.shape,
      ...Array.from({ length: 20 }, () => priv(b)._getTetrimino().shape),
    ];
    assert.notDeepEqual(seqA, seqB);
  });
});

// ---------------------------------------------------------------------------
// movement & collision
// ---------------------------------------------------------------------------

describe("TestMovement", () => {
  /** Tests for left/right movement and wall/collision blocking. */

  test("test_move_left_succeeds", () => {
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(core, TetriminoShape.T, [
      [25, 4],
      [25, 5],
      [24, 5],
      [25, 6],
    ]);
    assert.equal(core.doMoveLeft(), true);
    assert.deepEqual(core.curTetrimino!.bodies, [
      [25, 3],
      [25, 4],
      [24, 4],
      [25, 5],
    ]);
  });

  test("test_move_right_succeeds", () => {
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(core, TetriminoShape.T, [
      [25, 4],
      [25, 5],
      [24, 5],
      [25, 6],
    ]);
    assert.equal(core.doMoveRight(), true);
    assert.deepEqual(core.curTetrimino!.bodies, [
      [25, 5],
      [25, 6],
      [24, 6],
      [25, 7],
    ]);
  });

  test("test_move_left_blocked_at_wall", () => {
    const core = makeCore();
    setCurrent(core, TetriminoShape.T, [
      [25, 0],
      [25, 1],
      [24, 1],
      [25, 2],
    ]);
    assert.equal(core.doMoveLeft(), false);
  });

  test("test_move_right_blocked_at_wall", () => {
    const core = makeCore();
    setCurrent(core, TetriminoShape.T, [
      [25, 7],
      [25, 8],
      [24, 8],
      [25, 9],
    ]);
    assert.equal(core.doMoveRight(), false);
  });

  test("test_move_blocked_by_occupied_cell", () => {
    const core = makeCore();
    block(core, [[25, 3]]); // target of the leftmost cell when moving left
    setCurrent(core, TetriminoShape.T, [
      [25, 4],
      [25, 5],
      [24, 5],
      [25, 6],
    ]);
    assert.equal(core.doMoveLeft(), false);
  });

  test("test_lock_down_move_counter_caps_movement", () => {
    // Once the move counter hits the cap, sideways moves are refused.
    const core = makeCore();
    setCurrent(core, TetriminoShape.O, [
      [38, 4],
      [38, 5],
      [39, 4],
      [39, 5],
    ]);
    priv(core)._lockDownMoveCounter = core.gameRules.maxLockDownMoveCount;
    assert.equal(core.doMoveLeft(), false);
    assert.equal(core.doMoveRight(), false);
  });

  test("test_lock_down_move_counter_caps_rotation", () => {
    // Once the move counter hits the cap, rotation is a no-op.
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(core, TetriminoShape.T, [
      [25, 4],
      [25, 5],
      [24, 5],
      [25, 6],
    ]);
    const before = core.curTetrimino.direction;
    priv(core)._lockDownMoveCounter = core.gameRules.maxLockDownMoveCount;
    core.doRotateCw();
    assert.equal(core.curTetrimino!.direction, before);
  });
});

// ---------------------------------------------------------------------------
// rotation & SRS wall kicks
// ---------------------------------------------------------------------------

describe("TestRotation", () => {
  /** Tests for SRS rotation and wall-kick offset recording. */

  test("test_rotate_cw_changes_direction", () => {
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(
      core,
      TetriminoShape.T,
      [
        [25, 4],
        [25, 5],
        [24, 5],
        [25, 6],
      ],
      Direction.NORTH,
    );
    core.doRotateCw();
    assert.equal(core.curTetrimino!.direction, Direction.EAST);
    // Standard SRS rotation (no kick needed on an empty board).
    assert.deepEqual(
      cellSet(core.curTetrimino!.bodies),
      cellSet([
        [24, 5],
        [25, 5],
        [25, 6],
        [26, 5],
      ]),
    );
  });

  test("test_rotate_ccw_changes_direction", () => {
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(
      core,
      TetriminoShape.T,
      [
        [25, 4],
        [25, 5],
        [24, 5],
        [25, 6],
      ],
      Direction.NORTH,
    );
    core.doRotateCcw();
    assert.equal(core.curTetrimino!.direction, Direction.WEST);
  });

  test("test_o_piece_rotation_is_positional_noop", () => {
    // The O piece occupies the same cells after rotation (just reordered).
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(
      core,
      TetriminoShape.O,
      [
        [25, 4],
        [25, 5],
        [26, 4],
        [26, 5],
      ],
      Direction.NORTH,
    );
    const before = cellSet(core.curTetrimino.bodies);
    core.doRotateCw();
    assert.deepEqual(cellSet(core.curTetrimino!.bodies), before);
  });

  test("test_rotate_records_offset_zero", () => {
    // A rotation that succeeds on the first (0,0) kick records offset 0.
    //
    // Regression for the `_rotate` inner-loop variable shadowing bug, which
    // left `_rotate_offset` stuck at 3 regardless of the kick used.
    const core = makeCore();
    setCurrent(
      core,
      TetriminoShape.T,
      [
        [25, 4],
        [25, 5],
        [24, 5],
        [25, 6],
      ],
      Direction.NORTH,
    );
    core.doRotateCw();
    assert.equal(priv(core)._rotateOffset, 0);
  });

  test("test_srs_wall_kick_uses_second_offset", () => {
    // When the (0,0) kick is blocked, rotation falls to the next kick.
    //
    // Blocks the standard landing cell (26, 5) so the (0,0) offset fails; the
    // JLSTZ NORTH→EAST table's second offset (0, -1) must then apply, shifting
    // the piece one column left.
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(
      core,
      TetriminoShape.T,
      [
        [25, 4],
        [25, 5],
        [24, 5],
        [25, 6],
      ],
      Direction.NORTH,
    );
    block(core, [[26, 5]]); // block the (0,0)-offset landing cell
    core.doRotateCw();
    assert.equal(core.curTetrimino!.direction, Direction.EAST);
    assert.deepEqual(
      cellSet(core.curTetrimino!.bodies),
      cellSet([
        [24, 4],
        [25, 4],
        [25, 5],
        [26, 4],
      ]),
    );
    // The second kick (index 1) was used — not stuck at 3 (the old bug).
    assert.equal(priv(core)._rotateOffset, 1);
  });
});

// ---------------------------------------------------------------------------
// fall, lock-down, line clear
// ---------------------------------------------------------------------------

describe("TestFallLock", () => {
  /** Tests for soft/hard drop, lock-down, and top-out conditions. */

  test("test_soft_drop_awards_score_and_moves_down", () => {
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    setCurrent(core, TetriminoShape.T, [
      [25, 4],
      [25, 5],
      [24, 5],
      [25, 6],
    ]);
    core.doSoftDrop();
    assert.equal(core.score, core.level); // 1 × level per cell
    assert.deepEqual(core.curTetrimino!.bodies, [
      [26, 4],
      [26, 5],
      [25, 5],
      [26, 6],
    ]);
  });

  test("test_hard_drop_score", () => {
    // Hard drop awards 2 × level per row fallen.
    const core = makeCore();
    // O at rows 25-26 falls to rows 38-39: 13 rows.
    setCurrent(core, TetriminoShape.O, [
      [25, 4],
      [25, 5],
      [26, 4],
      [26, 5],
    ]);
    core.doHardDrop();
    assert.equal(core.score, 2 * core.level * 13);
  });

  test("test_hard_drop_locks_and_spawns_next", () => {
    const core = makeCore();
    setCurrent(core, TetriminoShape.O, [
      [25, 4],
      [25, 5],
      [26, 4],
      [26, 5],
    ]);
    core.doHardDrop();
    // Piece locked onto the board at the bottom.
    assert.equal(core.board[38][4], TetriminoShape.O);
    assert.equal(core.board[38][5], TetriminoShape.O);
    assert.equal(core.board[39][4], TetriminoShape.O);
    assert.equal(core.board[39][5], TetriminoShape.O);
    // A new piece has been spawned.
    assert.notEqual(core.curTetrimino, null);
    assert.ok(NORMAL_TETRIMINOS.includes(core.curTetrimino!.shape));
  });

  test("test_lock_in_buffer_zone_triggers_game_over", () => {
    // A piece that locks entirely in the buffer zone (rows < 20) tops out.
    const over: string[] = [];
    const core = makeCore(GameMode.ENDLESS, 0, null, (title) =>
      over.push(title),
    );
    block(
      core,
      Array.from({ length: W }, (_, c) => [20, c] as [number, number]),
    ); // floor the buffer
    setCurrent(core, TetriminoShape.O, [
      [18, 4],
      [18, 5],
      [19, 4],
      [19, 5],
    ]);
    core.doHardDrop();
    assert.deepEqual(over, ["game over!"]);
  });

  test("test_spawn_blocked_triggers_game_over", () => {
    // A piece whose spawn cells are occupied tops out immediately.
    const over: string[] = [];
    const core = makeCore(GameMode.ENDLESS, 0, null, (title) =>
      over.push(title),
    );
    // T spawn cells at GENERATE_POSITION[T] = (19, 3).
    block(core, [
      [19, 3],
      [19, 4],
      [18, 4],
      [19, 5],
    ]);
    forceNext(core, TetriminoShape.T);
    priv(core)._generateNewTetrimino();
    assert.deepEqual(over, ["game over!"]);
  });

  test("test_line_clear_single", () => {
    const core = makeCore();
    for (let c = 0; c < W; c++) core.board[39][c] = TetriminoShape.Z;
    assert.equal(priv(core)._lineClear(), 1);
    for (let c = 0; c < W; c++) {
      assert.equal(core.board[39][c], TetriminoShape.EMPTY);
    }
  });

  test("test_line_clear_tetris", () => {
    const core = makeCore();
    for (const r of [36, 37, 38, 39]) {
      for (let c = 0; c < W; c++) core.board[r][c] = TetriminoShape.Z;
    }
    assert.equal(priv(core)._lineClear(), 4);
  });

  test("test_line_clear_nonadjacent_rows", () => {
    const core = makeCore();
    for (let c = 0; c < W; c++) {
      core.board[39][c] = TetriminoShape.Z;
      core.board[30][c] = TetriminoShape.Z;
    }
    assert.equal(priv(core)._lineClear(), 2);
  });

  test("test_forced_game_over", () => {
    // `forced_game_over` immediately invokes the game-over callback.
    const over: string[] = [];
    const core = makeCore(GameMode.ENDLESS, 0, null, (title) =>
      over.push(title),
    );
    core.forcedGameOver("YOU WIN!");
    assert.deepEqual(over, ["YOU WIN!"]);
  });

  test("test_line_clear_animation_completes_via_process", () => {
    // A lock-down that completes a row starts an animation that `process()`
    // advances until the rows are actually cleared.
    const core = makeCore(GameMode.ENDLESS, 1);
    for (let c = 0; c < 8; c++) core.board[39][c] = TetriminoShape.Z; // pre-fill row 39 cols 0-7
    // O above cols 8-9 falls to fill row 39 cols 8-9 → row completes.
    setCurrent(core, TetriminoShape.O, [
      [25, 8],
      [25, 9],
      [26, 8],
      [26, 9],
    ]);
    core.doHardDrop();
    assert.equal(priv(core)._animating, true);
    assert.equal(core.lines, 0); // not yet cleared (animation pending)

    const anim = core.timing.clearAnimDuration;
    while (priv(core)._animating) {
      core.process(anim + 0.01);
    }

    assert.equal(priv(core)._animating, false);
    assert.equal(core.lines, 1);
    // No CLEAR markers left on the board.
    assert.ok(
      !core.board.some((row) => row.some((v) => v === TetriminoShape.CLEAR)),
    );
  });
});

// ---------------------------------------------------------------------------
// scoring
// ---------------------------------------------------------------------------

// (is_t_spin, cleared_lines) → (score_added, counter_attr, b2b_after,
//                               lines_for_level_added).  Level = 1, b2b start
// = False, so no B2B multiplier applies.
const SCORE_CASES: ReadonlyArray<
  readonly [number, number, number, string | null, boolean, number]
> = [
  [0, 0, 0, null, false, 0],
  [0, 1, 100, "_single", false, 1],
  [0, 2, 300, "_double", false, 3],
  [0, 3, 500, "_triple", false, 5],
  [0, 4, 800, "_tetris", true, 8],
  [1, 0, 100, "_tSpin", true, 4],
  [1, 1, 400, "_tSpinSingle", true, 8],
  [1, 2, 1200, "_tSpinDouble", true, 12],
  [1, 3, 1600, "_tSpinTriple", true, 16],
  [2, 0, 100, "_miniTSpin", true, 1],
  [2, 1, 200, "_miniTSpinSingle", true, 3],
];

describe("TestScoring", () => {
  /** Tests for the `_calc_score` scoring table and B2B multiplier. */

  test("test_calc_score_table", () => {
    // Upstream `@pytest.mark.parametrize("is_t_spin,cleared,...", SCORE_CASES)`.
    for (const [
      isTSpin,
      cleared,
      expScore,
      counterAttr,
      expB2b,
      expLfl,
    ] of SCORE_CASES) {
      const label = `case is_t_spin=${isTSpin}, cleared=${cleared}`;
      const core = makeCore();
      core.level = 1;
      priv(core)._b2bBonus = false;
      priv(core)._calcScore(isTSpin, cleared);
      assert.equal(core.score, expScore, `score (${label})`);
      assert.equal(core.lines, cleared, `lines (${label})`);
      assert.equal(priv(core)._b2bBonus, expB2b, `b2b (${label})`);
      assert.equal(priv(core)._linesForLevel, expLfl, `linesForLevel (${label})`);
      if (counterAttr !== null) {
        assert.equal(priv(core)[counterAttr], 1, `${counterAttr} (${label})`);
      }
    }
  });

  test("test_score_scales_with_level", () => {
    const core = makeCore();
    core.level = 3;
    priv(core)._calcScore(0, 1); // single = 100 × level
    assert.equal(core.score, 300);
  });

  test("test_b2b_tetris_chain_multiplies_score", () => {
    // Consecutive tetrises keep B2B alive; the second scores ×1.5.
    //
    // `level` and `_lines_for_level` are reset between calls so the B2B
    // multiplier is isolated from the level-up that a tetris would otherwise
    // trigger.
    const core = makeCore();
    priv(core)._b2bBonus = false;
    core.level = 1;
    priv(core)._linesForLevel = 0;
    priv(core)._calcScore(0, 4); // first tetris: 800, b2b → true
    assert.equal(core.score, 800);
    core.level = 1;
    priv(core)._linesForLevel = 0;
    priv(core)._calcScore(0, 4); // second tetris: B2B bonus active
    assert.equal(core.score, 800 + Math.trunc(1.5 * 800));
  });

  test("test_single_breaks_b2b_chain", () => {
    // A single clear after a tetris resets B2B and scores flat.
    const core = makeCore();
    priv(core)._b2bBonus = false;
    core.level = 1;
    priv(core)._linesForLevel = 0;
    priv(core)._calcScore(0, 4); // tetris, b2b True
    core.level = 1;
    priv(core)._linesForLevel = 0;
    priv(core)._calcScore(0, 1); // single: b2b reset, no multiplier
    assert.equal(core.score, 800 + 100);
    assert.equal(priv(core)._b2bBonus, false);
  });
});

// ---------------------------------------------------------------------------
// garbage system
// ---------------------------------------------------------------------------

// (is_t_spin, cleared, was_b2b) → outgoing garbage lines.
const GARBAGE_CASES: ReadonlyArray<readonly [number, number, boolean, number]> = [
  [0, 1, false, 0],
  [0, 2, false, 1],
  [0, 3, false, 2],
  [0, 4, false, 4],
  [0, 0, false, 0],
  [1, 0, false, 0],
  [1, 1, false, 2],
  [1, 2, false, 4],
  [1, 3, false, 6],
  [2, 0, false, 0],
  [2, 1, false, 0],
  [0, 4, true, 5], // 4 + 1 B2B
  [0, 2, true, 2], // 1 + 1 B2B
  [1, 2, true, 5], // 4 + 1 B2B
  [0, 1, true, 0], // single sends 0; B2B only adds when lines > 0
];

describe("TestGarbage", () => {
  /** Tests for garbage-line calculation, offset/cancel, and injection. */

  test("test_calc_garbage_lines", () => {
    // Upstream `@pytest.mark.parametrize("is_t_spin,cleared,was_b2b,expected", ...)`.
    for (const [isTSpin, cleared, wasB2b, expected] of GARBAGE_CASES) {
      const core = makeCore();
      assert.equal(
        priv(core)._calcGarbageLines(isTSpin, cleared, wasB2b),
        expected,
        `case is_t_spin=${isTSpin}, cleared=${cleared}, was_b2b=${wasB2b}`,
      );
    }
  });

  test("test_outgoing_cancels_incoming", () => {
    // Outgoing garbage offsets pending incoming garbage 1:1.
    const received: number[] = [];
    const core = makeCore(GameMode.ENDLESS, 0, (n) => received.push(n));
    core.garbageQueue = 2;
    priv(core)._pendingTSpin = 0;
    // Stub the messy parts of _finish_lock_down to isolate the offset logic.
    priv(core)._lineClear = () => 0;
    priv(core)._calcScore = (_ts: number, _cl: number) => false;
    priv(core)._calcGarbageLines = (_ts: number, _cl: number, _b2b: boolean) => 4;
    priv(core)._applyIncomingGarbage = () => {};
    priv(core)._generateNewTetrimino = () => {};
    priv(core)._buildNotice = (_ts: number, _cl: number, _b2b: boolean) => {};
    priv(core)._finishLockDown();
    // outgoing 4 cancels min(4, 2) = 2; queue 2 → 0; callback gets 4 - 2.
    assert.equal(core.garbageQueue, 0);
    assert.deepEqual(received, [2]);
  });

  test("test_no_outgoing_applies_all_incoming", () => {
    // With no outgoing garbage, the full incoming queue is applied.
    const applied: number[] = [];
    const core = makeCore();
    core.garbageQueue = 2;
    priv(core)._pendingTSpin = 0;
    priv(core)._lineClear = () => 0;
    priv(core)._calcScore = (_ts: number, _cl: number) => false;
    priv(core)._calcGarbageLines = (_ts: number, _cl: number, _b2b: boolean) => 0;
    priv(core)._applyIncomingGarbage = () =>
      applied.push(core.garbageQueue);
    priv(core)._generateNewTetrimino = () => {};
    priv(core)._buildNotice = (_ts: number, _cl: number, _b2b: boolean) => {};
    priv(core)._finishLockDown();
    assert.deepEqual(applied, [2]); // queue untouched (2) when apply runs
  });

  test("test_garbage_pushes_board_up", () => {
    const core = makeCore();
    for (let c = 0; c < W; c++) core.board[39][c] = TetriminoShape.Z;
    core.garbageQueue = 3;
    priv(core)._applyIncomingGarbage();
    assert.equal(core.garbageQueue, 0);
    // Original bottom row shifted up by 3 to row 36.
    for (let c = 0; c < W; c++) {
      assert.equal(core.board[36][c], TetriminoShape.Z);
    }
    // Bottom 3 rows are garbage, each with exactly one hole.
    for (const r of [37, 38, 39]) {
      let garbage = 0;
      for (let c = 0; c < W; c++) {
        if (core.board[r][c] === TetriminoShape.GARBAGE) garbage += 1;
      }
      assert.equal(garbage, W - 1);
    }
  });

  test("test_garbage_hole_shared_per_eight_lines", () => {
    // Every group of 8 garbage rows shares one hole column.
    const core = makeCore();
    core.garbageQueue = 10;
    priv(core)._applyIncomingGarbage();
    // Bottom 10 rows (30..39) are garbage. The first 8 (i=0..7, rows 30..37)
    // share a hole; the last 2 (i=8..9, rows 38..39) share another.
    const holes: Record<number, number> = {};
    for (let r = 30; r < 40; r++) {
      for (let c = 0; c < W; c++) {
        if (core.board[r][c] === TetriminoShape.EMPTY) {
          holes[r] = c;
          break;
        }
      }
    }
    const firstGroup = new Set<number>();
    for (let r = 30; r < 38; r++) firstGroup.add(holes[r]);
    const secondGroup = new Set<number>();
    for (let r = 38; r < 40; r++) secondGroup.add(holes[r]);
    assert.equal(firstGroup.size, 1);
    assert.equal(secondGroup.size, 1);
  });

  test("test_add_garbage_notices", () => {
    const core = makeCore();
    core.addGarbageLines(3);
    assert.equal(core.garbageQueue, 3);
    assert.equal(core.getNotice(), "Garbage +3!");
  });
});

// ---------------------------------------------------------------------------
// T-Spin detection
// ---------------------------------------------------------------------------

describe("TestTSpin", () => {
  /**
   * Tests for `_is_t_spin` corner logic and the offset-4 TST shortcut.
   *
   * Uses a NORTH-facing T at junction (25, 5) — the same layout as the
   * rotation tests. Its four corner cells around the junction:
   *
   *     front-left  (24,4)   front-right (24,6)   ← "front" (stem side, up)
   *             ┌───┐
   *             │ T │  (24,5)  stem
   *     ┌───┬───┴───┴───┬───┐
   *     …   │ T │ T │ T │   …      (25,4)(25,5)(25,6) bar
   *     ┌───┴───┴───┴───┬───┐
   *     back-left  (26,4)   back-right (26,6)  ← "back"
   */

  const northT = (core: TetrisCore): void => {
    setCurrent(
      core,
      TetriminoShape.T,
      [
        [25, 4],
        [25, 5],
        [24, 5],
        [25, 6],
      ],
      Direction.NORTH,
    );
    priv(core)._lastMove = MOVEMENT_ROTATE;
  };

  test("test_tspin_full_three_corners", () => {
    // Three corners filled with both front corners blocked ⇒ full (1).
    const core = makeCore();
    northT(core);
    block(core, [
      [24, 4],
      [24, 6],
      [26, 4],
    ]); // front-L, front-R, back-L
    assert.equal(priv(core)._isTSpin(), 1);
  });

  test("test_tspin_mini_front_corner_open", () => {
    // Three corners filled but one front corner open ⇒ mini (2).
    const core = makeCore();
    northT(core);
    // front-L, back-L, back-R filled; front-R (24,6) open.
    block(core, [
      [24, 4],
      [26, 4],
      [26, 6],
    ]);
    assert.equal(priv(core)._isTSpin(), 2);
  });

  test("test_tspin_requires_rotate_as_last_move", () => {
    // No T-Spin when the last move was a translation.
    const core = makeCore();
    northT(core);
    block(core, [
      [24, 4],
      [24, 6],
      [26, 4],
    ]);
    priv(core)._lastMove = MOVEMENT_MOVE;
    assert.equal(priv(core)._isTSpin(), 0);
  });

  test("test_tspin_requires_t_shape", () => {
    // Non-T pieces never register a T-Spin.
    const core = makeCore();
    setCurrent(
      core,
      TetriminoShape.O,
      [
        [25, 4],
        [25, 5],
        [26, 4],
        [26, 5],
      ],
      Direction.NORTH,
    );
    priv(core)._lastMove = MOVEMENT_ROTATE;
    assert.equal(priv(core)._isTSpin(), 0);
  });

  test("test_no_tspin_with_fewer_than_three_corners", () => {
    const core = makeCore();
    northT(core);
    block(core, [
      [24, 4],
      [26, 4],
    ]); // only two corners
    assert.equal(priv(core)._isTSpin(), 0);
  });

  test("test_offset4_shortcut_forces_full_tspin", () => {
    // A rotation that used the 5th wall-kick is a full T-Spin.
    //
    // Regression for the `_rotate` shadowing bug: `_rotate_offset` was stuck
    // at 3, so this `== 4` shortcut was unreachable dead code. With the fix, a
    // 5th-kick (TST-style) rotation yields a full T-Spin even when the corner
    // logic alone would classify it as mini.
    const core = makeCore();
    northT(core);
    block(core, [
      [24, 4],
      [26, 4],
      [26, 6],
    ]); // mini-like, front-R open
    priv(core)._rotateOffset = 4;
    assert.equal(priv(core)._isTSpin(), 1); // shortcut overrides mini
  });

  test("test_offset4_shortcut_contrast", () => {
    // The same mini-like config without offset 4 stays mini (2).
    const core = makeCore();
    northT(core);
    block(core, [
      [24, 4],
      [26, 4],
      [26, 6],
    ]);
    priv(core)._rotateOffset = 0;
    assert.equal(priv(core)._isTSpin(), 2);
  });

  // Upstream parametrises `(direction, bodies, front_corners, back_corner)`.
  const ORIENTATION_CASES: ReadonlyArray<{
    direction: Direction;
    bodies: ReadonlyArray<readonly [number, number]>;
    frontCorners: ReadonlyArray<readonly [number, number]>;
    backCorner: readonly [number, number];
  }> = [
    {
      direction: Direction.EAST,
      bodies: [
        [24, 5],
        [25, 5],
        [25, 6],
        [26, 5],
      ],
      frontCorners: [
        [24, 6],
        [26, 6],
      ],
      backCorner: [24, 4],
    },
    {
      direction: Direction.SOUTH,
      bodies: [
        [25, 4],
        [25, 5],
        [26, 5],
        [25, 6],
      ],
      frontCorners: [
        [26, 4],
        [26, 6],
      ],
      backCorner: [24, 4],
    },
    {
      direction: Direction.WEST,
      bodies: [
        [24, 5],
        [25, 5],
        [25, 4],
        [26, 5],
      ],
      frontCorners: [
        [24, 4],
        [26, 4],
      ],
      backCorner: [24, 6],
    },
  ];

  test("test_tspin_full_each_orientation", () => {
    // Full T-Spin (front corners both blocked) in EAST/SOUTH/WEST.
    for (const { direction, bodies, frontCorners, backCorner } of ORIENTATION_CASES) {
      const core = makeCore();
      setCurrent(core, TetriminoShape.T, bodies, direction);
      priv(core)._lastMove = MOVEMENT_ROTATE;
      priv(core)._rotateOffset = 0;
      block(core, [...frontCorners, backCorner]);
      assert.equal(
        priv(core)._isTSpin(),
        1,
        `direction=${direction}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// hold, shadow, serialise, pause
// ---------------------------------------------------------------------------

describe("TestHold", () => {
  /** Tests for the hold mechanic. */

  test("test_hold_once_per_lockdown", () => {
    const core = makeCore();
    const first = core.curTetrimino;
    core.doHold(); // first hold succeeds
    assert.equal(core.hold, first);
    const afterFirst = core.curTetrimino;
    core.doHold(); // second hold is a silent no-op
    assert.equal(core.curTetrimino, afterFirst); // piece did not change
  });

  test("test_hold_first_stores_current", () => {
    const core = makeCore();
    const first = core.curTetrimino;
    core.doHold();
    assert.equal(core.hold, first);
    assert.notEqual(core.curTetrimino, first);
  });

  test("test_hold_swap_returns_previous", () => {
    // Holding again puts the previously-held piece back into play.
    const core = makeCore();
    assert.ok(core.curTetrimino, "curTetrimino is null");
    const first = core.curTetrimino;
    core.doHold(); // hold = first
    // Force the spawned replacement so we can identify it, then hold again.
    core.doHardDrop(); // lock the second; resets _hold_once via _lock_down
    const third = core.curTetrimino;
    core.doHold(); // swap: third → hold, first → back into play
    assert.equal(core.hold, third);
    assert.equal(core.curTetrimino!.shape, first.shape);
  });
});

describe("TestShadow", () => {
  /** Tests for ghost-piece projection. */

  test("test_shadow_projects_to_lowest_valid", () => {
    const core = makeCore();
    setCurrent(core, TetriminoShape.O, [
      [25, 4],
      [25, 5],
      [26, 4],
      [26, 5],
    ]);
    priv(core)._handleShadow();
    assert.deepEqual(
      cellSet(core.shadow),
      cellSet([
        [38, 4],
        [38, 5],
        [39, 4],
        [39, 5],
      ]),
    );
  });

  test("test_shadow_rests_on_floor", () => {
    const core = makeCore();
    setCurrent(core, TetriminoShape.O, [
      [37, 4],
      [37, 5],
      [38, 4],
      [38, 5],
    ]);
    priv(core)._handleShadow();
    assert.deepEqual(
      cellSet(core.shadow),
      cellSet([
        [38, 4],
        [38, 5],
        [39, 4],
        [39, 5],
      ]),
    );
  });

  test("test_shadow_rests_on_block", () => {
    const core = makeCore();
    block(core, [
      [33, 4],
      [33, 5],
    ]); // floor under cols 4-5 at row 33
    setCurrent(core, TetriminoShape.O, [
      [25, 4],
      [25, 5],
      [26, 4],
      [26, 5],
    ]);
    priv(core)._handleShadow();
    assert.deepEqual(
      cellSet(core.shadow),
      cellSet([
        [31, 4],
        [31, 5],
        [32, 4],
        [32, 5],
      ]),
    );
  });
});

describe("TestSerialise", () => {
  /** Tests for board serialisation. */

  test("test_returns_int_grid", () => {
    const core = makeCore();
    const grid = core.serializeBoard();
    assert.equal(grid.length, H);
    assert.ok(grid.every((row) => row.length === W));
    // Empty board → all EMPTY (0).
    assert.ok(
      grid.every((row) => row.every((v) => v === TetriminoShape.EMPTY)),
    );
  });

  test("test_values_match_shape_enums", () => {
    const core = makeCore();
    block(core, [[39, 0]], TetriminoShape.I);
    assert.equal(core.serializeBoard()[39][0], TetriminoShape.I);
  });
});

describe("TestPause", () => {
  /** Tests for pause / controllability / notice behaviour. */

  test("test_toggle_pause_switches_state", () => {
    const core = makeCore();
    assert.equal(core.paused, false);
    core.togglePause();
    assert.equal(core.paused, true);
    core.togglePause();
    assert.equal(core.paused, false);
  });

  test("test_toggle_pause_ignored_in_versus", () => {
    const core = makeCore(GameMode.VERSUS);
    core.togglePause();
    assert.equal(core.paused, false);
  });

  test("test_controllable_false_when_paused", () => {
    const core = makeCore();
    core.togglePause();
    assert.equal(core.controllable(), false);
  });

  test("test_controllable_false_when_animating", () => {
    const core = makeCore();
    priv(core)._animating = true;
    assert.equal(core.controllable(), false);
  });

  test("test_get_notice_paused", () => {
    const core = makeCore();
    core.togglePause();
    assert.equal(core.getNotice(), "PAUSED");
  });

  test("test_get_notice_expires_after_one_second", () => {
    // Notices vanish after the 1-second display window.
    //
    // Upstream monkeypatches `tetris.core.time.time`; the port routes notice
    // expiry through the injected clock, so `FakeClock.advance(1)` replaces it.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    priv(core)._setNotice("Single!");
    assert.equal(core.getNotice(), "Single!");
    clock.advance(1.0);
    assert.equal(core.getNotice(), "");
  });
});

describe("TestPauseTime", () => {
  /**
   * Tests for elapsed-time preservation across pause/unpause cycles.
   *
   * Regression guard: `toggle_pause` previously dropped `_running_since`
   * without accumulating into `_elapsed`, so `game_time` reset to 0 the instant
   * the game was paused (and never recovered after unpause).
   */

  test("test_game_time_progresses_while_running", () => {
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    clock.advance(10);
    assertApprox(core.gameTime, 10.0);
  });

  test("test_pause_preserves_elapsed_time", () => {
    // Pausing must NOT zero out the elapsed time.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    clock.advance(10);
    core.togglePause();
    assert.equal(core.paused, true);
    assertApprox(core.gameTime, 10.0); // not 0 (the regression)
  });

  test("test_game_time_frozen_while_paused", () => {
    // While paused, the clock must not advance.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    clock.advance(10);
    core.togglePause();
    clock.advance(30); // paused for 30s — must not count
    assertApprox(core.gameTime, 10.0);
  });

  test("test_unpause_resumes_from_preserved_time", () => {
    // After unpause, time continues from where it left off, not from 0.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    clock.advance(10);
    core.togglePause();
    clock.advance(30); // paused
    core.togglePause(); // unpause
    assertApprox(core.gameTime, 10.0);
    clock.advance(5);
    assertApprox(core.gameTime, 15.0);
  });

  test("test_multiple_pause_cycles_accumulate", () => {
    // Only running intervals count; paused intervals are excluded.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    clock.advance(5); // run 5s
    core.togglePause();
    clock.advance(20); // paused 20s (excluded)
    core.togglePause();
    clock.advance(5); // run 5s → 10s total
    core.togglePause();
    clock.advance(10); // paused 10s (excluded)
    core.togglePause();
    clock.advance(5); // run 5s → 15s total
    assertApprox(core.gameTime, 15.0);
  });

  test("test_pause_excluded_from_time_remaining", () => {
    // In Time Attack, pause time must not eat into the countdown.
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.TIME_ATTACK, 0, null, null, clock);
    clock.advance(10);
    core.togglePause();
    clock.advance(60); // paused 60s — should NOT consume the countdown
    core.togglePause();
    // Only 10s of game time elapsed → 110s of 120s remaining.
    assertApprox(core.gameTime, 10.0);
    assert.equal(core.timeRemaining, "01:50:00");
  });
});

// ---------------------------------------------------------------------------
// levelling & mode end conditions
// ---------------------------------------------------------------------------

describe("TestLeveling", () => {
  /** Tests for level progression, caps, and mode-end triggers. */

  test("test_level_up_threshold", () => {
    // Level 1 → 2 needs `_lines_for_level >= 5` (5 singles).
    const core = makeCore();
    priv(core)._b2bBonus = false;
    for (let i = 0; i < 5; i++) {
      priv(core)._calcScore(0, 1); // +1 to _lines_for_level each
    }
    assert.equal(core.level, 2);
  });

  test("test_level_up_once_per_lockdown", () => {
    // A single lock-down levels up at most once (`if`, not `while`).
    const core = makeCore();
    priv(core)._b2bBonus = false;
    priv(core)._calcScore(0, 4); // tetris: +8 to _lines_for_level (≥5 → level 2)
    assert.equal(core.level, 2); // not 3 (8 < 15, the level-2→3 threshold)
  });

  test("test_max_level_15_in_endless", () => {
    const core = makeCore(GameMode.ENDLESS);
    core.level = 15;
    priv(core)._b2bBonus = false;
    priv(core)._calcScore(0, 4);
    assert.equal(core.level, 15);
  });

  test("test_casual_caps_at_level_5", () => {
    const core = makeCore(GameMode.CASUAL);
    core.level = 5;
    priv(core)._linesForLevel = 100; // past the level-5→6 threshold (75)
    priv(core)._b2bBonus = false;
    priv(core)._calcScore(0, 4);
    assert.equal(core.level, 5);
  });

  test("test_150_lines_mode_ends_at_150", () => {
    const over: string[] = [];
    const core = makeCore(GameMode.LINES_150, 0, null, (title) =>
      over.push(title),
    );
    core.lines = 149;
    priv(core)._b2bBonus = false;
    priv(core)._calcScore(0, 1); // lines → 150
    assert.deepEqual(over, ["game over!"]);
  });

  test("test_time_attack_ends_in_calc_score", () => {
    const over: string[] = [];
    const fixed = DEFAULT_START_MS;
    const clock = new FakeClock(fixed);
    const core = makeCore(
      GameMode.TIME_ATTACK,
      0,
      null,
      (title) => over.push(title),
      clock,
    );
    const duration = core.gameRules.timeAttackDuration;
    priv(core)._runningSince = fixed;
    priv(core)._elapsedMs = duration * 1000;
    priv(core)._calcScore(0, 0);
    assert.deepEqual(over, ["game over!"]);
  });

  test("test_time_attack_ends_in_process", () => {
    const over: string[] = [];
    const fixed = DEFAULT_START_MS;
    const clock = new FakeClock(fixed);
    const core = makeCore(
      GameMode.TIME_ATTACK,
      0,
      null,
      (title) => over.push(title),
      clock,
    );
    const duration = core.gameRules.timeAttackDuration;
    priv(core)._runningSince = fixed;
    priv(core)._elapsedMs = duration * 1000;
    core.process(0.01);
    assert.deepEqual(over, ["game over!"]);
  });
});

// ---------------------------------------------------------------------------
// process() timing
// ---------------------------------------------------------------------------

describe("TestProcess", () => {
  /** Tests for the per-tick update loop's timing semantics. */

  test("test_process_falls_one_row_per_interval", () => {
    const core = makeCore(GameMode.ENDLESS, 1);
    const startLowest = priv(core)._getCurrentLowest();
    core.process(priv(core)._fallSpeed); // exactly one fall interval
    assert.equal(priv(core)._getCurrentLowest(), startLowest + 1);
  });

  test("test_process_large_delta_does_not_catch_up", () => {
    // A delta far exceeding fall speed still moves the piece only once.
    const core = makeCore(GameMode.ENDLESS, 1);
    const startLowest = priv(core)._getCurrentLowest();
    core.process(10.0);
    assert.equal(priv(core)._getCurrentLowest(), startLowest + 1);
  });

  test("test_digging_mode_auto_adds_garbage", () => {
    const core = makeCore(GameMode.DIGGING, 1);
    const increment = priv(core)._diggingModeLineIncrementTime;
    core.process(increment + 0.01);
    assert.ok(core.garbageQueue >= 1);
  });
});

// ---------------------------------------------------------------------------
// headless integration
// ---------------------------------------------------------------------------

/**
 * Drive a game with hard-drop-only input until game over or *limit*.
 *
 * Returns `(score, lines, level, ticks, over)`. The line-clear animation is
 * flushed between drops so the board state stays consistent.
 */
function playHardDrops(
  seed: number,
  limit = 2000,
): [number, number, number, number, boolean] {
  const over: string[] = [];
  const core = makeCore(GameMode.ENDLESS, seed, null, (title) =>
    over.push(title),
  );
  const anim = core.timing.clearAnimDuration;
  let ticks = 0;
  while (over.length === 0 && ticks < limit) {
    core.doHardDrop();
    while (priv(core)._animating) {
      core.process(anim + 0.01);
    }
    ticks += 1;
  }
  return [core.score, core.lines, core.level, ticks, over.length > 0];
}

describe("TestIntegration", () => {
  /** End-to-end tests driving the public API without curses. */

  test("test_full_game_no_exception", () => {
    // A hard-drop-only game runs to game-over without raising.
    const [, , , , over] = playHardDrops(7);
    assert.ok(over, "game should top out within the drop limit");
  });

  test("test_deterministic_replay", () => {
    // Same seed + same input ⇒ identical final score/lines/level.
    const a = playHardDrops(7);
    const b = playHardDrops(7);
    assert.deepEqual(a, b);
  });
});

// ---------------------------------------------------------------------------
// lock-down notice strings
// ---------------------------------------------------------------------------

const NOTICE_CASES: ReadonlyArray<readonly [number, number, string]> = [
  [0, 1, "Single!"],
  [0, 2, "Double!"],
  [0, 3, "Triple!"],
  [0, 4, "Tetris!"],
  [1, 0, "T-Spin!"],
  [1, 1, "T-Spin Single!"],
  [1, 2, "T-Spin Double!"],
  [1, 3, "T-Spin Triple!"],
  [2, 0, "T-Spin Mini!"],
  [2, 1, "T-Spin Mini Single!"],
  [0, 0, ""], // no clear, no t-spin → no notice
];

describe("TestNotice", () => {
  /** Tests for `_build_notice` action strings and the B2B suffix. */

  test("test_notice_strings", () => {
    // Upstream `@pytest.mark.parametrize("is_t_spin,cleared,expected", ...)`.
    for (const [isTSpin, cleared, expected] of NOTICE_CASES) {
      const clock = new FakeClock(DEFAULT_START_MS);
      const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
      priv(core)._b2bBonus = false;
      priv(core)._buildNotice(isTSpin, cleared, false);
      assert.equal(
        core.getNotice(),
        expected,
        `case is_t_spin=${isTSpin}, cleared=${cleared}`,
      );
    }
  });

  test("test_b2b_suffix_when_active", () => {
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    priv(core)._b2bBonus = true;
    priv(core)._buildNotice(0, 4, true); // tetris, B2B active
    assert.equal(core.getNotice(), "Tetris! B2B!");
  });

  test("test_no_b2b_suffix_when_inactive", () => {
    const clock = new FakeClock(DEFAULT_START_MS);
    const core = makeCore(GameMode.ENDLESS, 0, null, null, clock);
    priv(core)._b2bBonus = false; // chain already broken
    priv(core)._buildNotice(0, 4, true);
    assert.equal(core.getNotice(), "Tetris!");
  });
});
