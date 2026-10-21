/**
 * Main game logic — the TetrisCore engine.
 *
 * Ported 1:1 from `tetris-terminal/src/tetris/core.py` (MIT, by jayzhu,
 * https://github.com/zlh124/tetris-terminal). Behavioural quirks that affect
 * the feel of the game are deliberately preserved; see the notes on each
 * method. Deliberate deviations from upstream:
 *
 *   - `datetime` / `time.time()` are replaced by an injected {@link Clock}.
 *   - the global `random` module is replaced by an injected {@link Rng}.
 *   - `RuntimeError` guards become plain `Error`s.
 *
 * Everything else — scoring, T-Spin detection, lock-down timing, the 7-bag,
 * garbage handling and the line-clear animation — matches upstream.
 */

import { systemClock } from "./clock.ts";
import type { Clock } from "./clock.ts";
import { defaultConfig } from "./config.ts";
import type { Config, GameRulesConfig, TimingConfig } from "./config.ts";
import { GENERATE_POSITION, rotationEntry, SHAPE_TABLE } from "./constants.ts";
import type { Point } from "./constants.ts";
import { BoundedDeque } from "./deque.ts";
import {
  DIRECTIONS,
  Direction,
  GameMode,
  gameModeLabel,
  NORMAL_TETRIMINOS,
  TetriminoShape,
} from "./enums.ts";
import { seededRng, systemRng } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { SettlementMessage } from "./settlement.ts";
import type { SettlementFields } from "./settlement.ts";

const BUFFER_ROWS = 20;
const LOCK_DOWN_DELAY_SECONDS = 0.5;
const NOTICE_TTL_MS = 1000;
const BAG_CYCLE = 7;
const BAG_MAXLEN = 14;

/** A single tetrimino piece on the board. */
export class Tetrimino {
  /** Current orientation of the piece. */
  direction: Direction = Direction.NORTH;
  /** Numeric shape value (same as `shape`). */
  readonly no: number;
  /** The tetrimino shape identifier. */
  readonly shape: TetriminoShape;
  /** List of `[row, col]` cells occupied by this piece. */
  bodies: Point[];

  constructor(shape: TetriminoShape) {
    this.no = shape;
    this.shape = shape;
    const [dx, dy] = GENERATE_POSITION[shape];
    this.bodies = SHAPE_TABLE[shape].map(
      ([x, y]) => [x + dx, y + dy] as Point,
    );
  }

  [Symbol.iterator](): Iterator<Point> {
    return this.bodies[Symbol.iterator]();
  }
}

/** Lock-down callback: receives the number of garbage lines to send. */
export type LockDownCallback = (garbageLines: number) => void;
/** Game-over callback: receives the title and the settlement message. */
export type GameOverCallback = (title: string, settlement: SettlementMessage) => void;

/** Constructor options for {@link TetrisCore}. */
export interface TetrisCoreOptions {
  gameMode: GameMode;
  config?: Config;
  lockDownCallback?: LockDownCallback;
  gameOverCallback?: GameOverCallback;
  /** Seeds an internal deterministic RNG (used by the ported tests). */
  seed?: number;
  /** Explicit randomness seam; takes precedence over `seed`. */
  rng?: Rng;
  /** Explicit time seam; defaults to the system clock. */
  clock?: Clock;
  /** Advanced: replaces the 7-bag piece source. */
  tetriminoGenerator?: () => Tetrimino;
}

/** Type of last successful move (for T-Spin detection). */
enum Movement {
  MOVE = 0,
  ROTATE = 1,
}

export class TetrisCore {
  private readonly _gameMode: GameMode;
  private readonly _config: Config;
  private readonly _lockDownCallback: LockDownCallback;
  private readonly _gameOverCallback: GameOverCallback;
  private readonly _rng: Rng;
  private readonly _clock: Clock;
  private readonly _nextTetrimino: () => Tetrimino;

  // Multiplayer
  garbageQueue = 0;

  // Score / progress
  score = 0;
  lines = 0;
  level = 1;
  private _elapsedMs = 0;
  private _runningSince: number | null;
  private _linesForLevel = 0;

  // settlement
  private _single = 0;
  private _double = 0;
  private _triple = 0;
  private _tetris = 0;
  private _tSpin = 0;
  private _tSpinSingle = 0;
  private _tSpinDouble = 0;
  private _tSpinTriple = 0;
  private _miniTSpin = 0;
  private _miniTSpinSingle = 0;

  // Game flow
  paused = false;
  private _animating = false;
  private _clearAnimPlayed = 0;
  private _pendingTSpin = 0;

  // Piece state
  curTetrimino: Tetrimino | null = null;
  hold: Tetrimino | null = null;
  holdOnce = false;

  // Timers
  frameTimer = 0.0;
  private _normalFallTimer = 0;
  private _lineIncrementTimer = 0;
  private _lockDownTimer = 0;
  private _noticeTimerMs = 0;

  // Lock-down tracking
  private _lockDownMoveCounter = 0;
  private _lowest = 0;

  // Combo / T-Spin tracking
  private _b2bBonus = false;
  private _lastMove: Movement = Movement.MOVE;
  private _rotateOffset = 0;

  // Notice
  private _notice = "";

  // Board, bag, shadow
  board: TetriminoShape[][];
  shadow: Point[] = [];
  bag: BoundedDeque<Tetrimino>;

  constructor(options: TetrisCoreOptions) {
    this._gameMode = options.gameMode;
    this._config = options.config ?? defaultConfig();
    this._lockDownCallback = options.lockDownCallback ?? (() => {});
    this._gameOverCallback = options.gameOverCallback ?? (() => {});
    this._rng = options.rng ?? (options.seed !== undefined ? seededRng(options.seed) : systemRng);
    this._clock = options.clock ?? systemClock;

    if (options.tetriminoGenerator !== undefined) {
      this._nextTetrimino = options.tetriminoGenerator;
    } else {
      // Upstream builds a generator that yields shuffled 7-batches. Because
      // `_replenishBag` always consumes exactly seven pieces, the generator's
      // internal queue drains exactly on a batch boundary, so this is
      // equivalent to shuffling a fresh batch per replenish.
      let queue: Tetrimino[] = [];
      this._nextTetrimino = (): Tetrimino => {
        if (queue.length === 0) {
          queue = NORMAL_TETRIMINOS.map((s) => new Tetrimino(s));
          this._rng.shuffle(queue);
        }
        return queue.shift() as Tetrimino;
      };
    }

    this._runningSince = this._clock.now();

    this.board = Array.from({ length: this._config.gameRules.boardHeight }, () =>
      new Array<TetriminoShape>(this._config.gameRules.boardWidth).fill(
        TetriminoShape.EMPTY,
      ),
    );
    this.bag = new BoundedDeque<Tetrimino>(BAG_MAXLEN);

    this._initGame();
  }

  // ======================================================================
  // properties
  // ======================================================================

  get gameRules(): GameRulesConfig {
    return this._config.gameRules;
  }

  get timing(): TimingConfig {
    return this._config.timing;
  }

  get gameMode(): GameMode {
    return this._gameMode;
  }

  /** Elapsed game time in seconds (pauses excluded). */
  get gameTime(): number {
    const elapsed =
      this._runningSince !== null
        ? this._elapsedMs + (this._clock.now() - this._runningSince)
        : this._elapsedMs;
    return elapsed / 1000;
  }

  /** Elapsed game time formatted as `MM:SS:CC`. */
  get gameTimeStr(): string {
    return formatClock(this.gameTime);
  }

  /** Countdown for Time Attack mode, formatted as `MM:SS:CC`. */
  get timeRemaining(): string {
    const elapsedMs =
      this._runningSince !== null
        ? this._elapsedMs + (this._clock.now() - this._runningSince)
        : this._elapsedMs;
    const remaining =
      this._config.gameRules.timeAttackDuration - elapsedMs / 1000;
    if (remaining <= 0) return "00:00:00";
    return formatClock(remaining);
  }

  /** Current normal-fall interval in seconds (standard guideline formula). */
  private get _fallSpeed(): number {
    return (0.8 - (this.level - 1) * 0.007) ** (this.level - 1);
  }

  /** The time for digging mode to increase one line. */
  private get _diggingModeLineIncrementTime(): number {
    if (this.lines <= 50) return 5;
    if (this.lines <= 100) return 4;
    if (this.lines <= 200) return 3;
    if (this.lines <= 300) return 2;
    if (this.lines <= 400) return 1;
    return 0.5;
  }

  // ======================================================================
  // bag / spawn
  // ======================================================================

  /** Add 7 tetriminos to the bag (one of each shape). */
  private _replenishBag(): void {
    for (let i = 0; i < BAG_CYCLE; i++) {
      this.bag.append(this._nextTetrimino());
    }
  }

  /** Fill the bag with two cycles (14 pieces) at game start. */
  private _initBag(): void {
    for (let i = 0; i < 2; i++) this._replenishBag();
  }

  /** Pop the next piece from the bag, replenishing when it drops to 7. */
  private _getTetrimino(): Tetrimino {
    const tetrimino = this.bag.popleft();
    if (this.bag.length === BAG_CYCLE) this._replenishBag();
    return tetrimino;
  }

  /** Bottom-most row occupied by the current piece. */
  private _getCurrentLowest(): number {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    let lowest = -Infinity;
    for (const [x] of this.curTetrimino) if (x > lowest) lowest = x;
    return lowest;
  }

  /** Build a settlement message from the current counters. */
  private _getCurrentSettlement(): SettlementMessage {
    const fields: SettlementFields = {
      score: this.score,
      lines: this.lines,
      time: this.gameTimeStr,
      single: this._single,
      double: this._double,
      triple: this._triple,
      tetris: this._tetris,
      tSpin: this._tSpin,
      tSpinSingle: this._tSpinSingle,
      tSpinDouble: this._tSpinDouble,
      tSpinTriple: this._tSpinTriple,
      miniTSpin: this._miniTSpin,
      miniTSpinSingle: this._miniTSpinSingle,
      gameMode: gameModeLabel(this._gameMode),
    };
    return new SettlementMessage("", fields);
  }

  /**
   * Spawn the next piece. If the spawn position is blocked the game-over
   * callback is invoked immediately.
   */
  private _generateNewTetrimino(): void {
    this.curTetrimino = this._getTetrimino();
    for (const [x, y] of this.curTetrimino) {
      if (this.board[x][y] !== TetriminoShape.EMPTY) {
        this._gameOverCallback("game over!", this._getCurrentSettlement());
        return;
      }
    }
    this._moveDown();
  }

  /** Remove all fully-filled rows; returns the number of rows cleared. */
  private _lineClear(): number {
    let res = 0;
    for (let row = this._config.gameRules.boardHeight - 1; row >= 0; row--) {
      while (this.board[row].every((v) => v !== TetriminoShape.EMPTY)) {
        res += 1;
        for (let i = row - 1; i >= 0; i--) {
          this.board[i + 1] = this.board[i];
        }
        this.board[0] = new Array<TetriminoShape>(
          this._config.gameRules.boardWidth,
        ).fill(TetriminoShape.EMPTY);
      }
    }
    return res;
  }

  // ======================================================================
  // collision
  // ======================================================================

  private _checkCanMoveDown(): boolean {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (const [x, y] of this.curTetrimino) {
      if (
        x + 1 >= this._config.gameRules.boardHeight ||
        this.board[x + 1][y] !== TetriminoShape.EMPTY
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Whether the current piece can move left.
   *
   * Upstream quirk preserved: exceeding the lock-down move counter DISABLES
   * movement outright (it does not merely stop counting).
   */
  private _checkCanMoveLeft(): boolean {
    if (
      this._lockDownMoveCounter >=
      this._config.gameRules.maxLockDownMoveCount
    ) {
      return false;
    }
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (const [x, y] of this.curTetrimino) {
      if (y - 1 < 0 || this.board[x][y - 1] !== TetriminoShape.EMPTY) {
        return false;
      }
    }
    return true;
  }

  /** Whether the current piece can move right (same counter quirk as left). */
  private _checkCanMoveRight(): boolean {
    if (
      this._lockDownMoveCounter >=
      this._config.gameRules.maxLockDownMoveCount
    ) {
      return false;
    }
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (const [x, y] of this.curTetrimino) {
      if (
        y + 1 >= this._config.gameRules.boardWidth ||
        this.board[x][y + 1] !== TetriminoShape.EMPTY
      ) {
        return false;
      }
    }
    return true;
  }

  /** Whether `point` is within bounds and empty. */
  private _checkPointEmpty(point: Point): boolean {
    const [x, y] = point;
    return (
      x >= 0 &&
      x < this._config.gameRules.boardHeight &&
      y >= 0 &&
      y < this._config.gameRules.boardWidth &&
      this.board[x][y] === TetriminoShape.EMPTY
    );
  }

  private _checkPointsEmpty(points: readonly Point[]): boolean {
    return points.every((p) => this._checkPointEmpty(p));
  }

  // ======================================================================
  // movement primitives
  // ======================================================================

  /** Rotate the current piece using SRS wall-kick offsets. */
  private _rotate(curDirection: Direction, nextDirection: Direction): void {
    if (
      this._lockDownMoveCounter >=
      this._config.gameRules.maxLockDownMoveCount
    ) {
      // can only rotate 15 times when reach bottom
      return;
    }
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    const entry = rotationEntry(
      this.curTetrimino.shape,
      curDirection,
      nextDirection,
    );
    if (entry === undefined) return;

    const rotated = this.curTetrimino.bodies.map(([x, y], i) => {
      const [dx, dy] = entry.standardRotateDiff[i];
      return [x + dx, y + dy] as Point;
    });

    for (let i = 0; i < entry.offsets.length; i++) {
      const [dx, dy] = entry.offsets[i];
      const tmp = rotated.map(([x, y]) => [x + dx, y + dy] as Point);
      if (this._checkPointsEmpty(tmp)) {
        this.curTetrimino.bodies = tmp;
        this.curTetrimino.direction = nextDirection;

        this._lastMove = Movement.ROTATE;

        // counter++ reset timer
        this._lockDownMoveCounter += 1;
        this._lockDownTimer = 0;

        // record the rotate offset for t-spin calculation
        this._rotateOffset = i;
        return;
      }
    }
  }

  /** Move the current piece down one row. */
  private _moveDown(): boolean {
    if (!this._checkCanMoveDown()) return false;
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
      const [x, y] = this.curTetrimino.bodies[i];
      this.curTetrimino.bodies[i] = [x + 1, y];
    }
    return true;
  }

  private _setNotice(notice: string): void {
    this._notice = notice;
    this._noticeTimerMs = this._clock.now();
  }

  /**
   * Detect T-Spin status on lock-down. A T-Spin is when the T-piece was
   * rotated last, and at least 3 of the 4 corner cells are blocked.
   *
   * @returns `0` none, `1` full T-Spin, `2` Mini T-Spin.
   */
  private _isTSpin(): number {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    if (
      this.curTetrimino.shape !== TetriminoShape.T ||
      this._lastMove !== Movement.ROTATE
    ) {
      return 0;
    }
    const [cx, cy] = this.curTetrimino.bodies[1];

    let corners = 0;
    for (const p of [
      [cx - 1, cy - 1],
      [cx + 1, cy - 1],
      [cx - 1, cy + 1],
      [cx + 1, cy + 1],
    ] as Point[]) {
      if (!this._checkPointEmpty(p)) corners += 1;
    }

    if (corners < 3) return 0;
    // if rotate offset is 4th point, it's t-spin
    if (this._rotateOffset === 4) return 1;

    let slots: Point[] = [];
    if (this.curTetrimino.direction === Direction.NORTH) {
      slots = [
        [cx - 1, cy - 1],
        [cx - 1, cy + 1],
      ];
    }
    if (this.curTetrimino.direction === Direction.EAST) {
      slots = [
        [cx - 1, cy + 1],
        [cx + 1, cy + 1],
      ];
    }
    if (this.curTetrimino.direction === Direction.SOUTH) {
      slots = [
        [cx + 1, cy - 1],
        [cx + 1, cy + 1],
      ];
    }
    if (this.curTetrimino.direction === Direction.WEST) {
      slots = [
        [cx - 1, cy - 1],
        [cx + 1, cy - 1],
      ];
    }
    return slots.every((p) => !this._checkPointEmpty(p)) ? 1 : 2;
  }

  /** Lock the current piece onto the board. */
  private _lockDown(): void {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    // all cells in buffer zone when lock down
    if (this.curTetrimino.bodies.every(([x]) => x < BUFFER_ROWS)) {
      this._gameOverCallback("game over!", this._getCurrentSettlement());
      return;
    }

    // fill cur tetrimino to the board
    for (const [x, y] of this.curTetrimino) {
      this.board[x][y] = this.curTetrimino.shape;
    }

    this._pendingTSpin = this._isTSpin();

    // mark full rows with CLEAR for animation
    let hasClear = false;
    for (let row = this._config.gameRules.boardHeight - 1; row >= 0; row--) {
      if (this.board[row].every((v) => v !== TetriminoShape.EMPTY)) {
        for (let col = 0; col < this._config.gameRules.boardWidth; col++) {
          this.board[row][col] = TetriminoShape.CLEAR;
        }
        hasClear = true;
      }
    }

    // reset lock down
    this._lockDownTimer = 0;
    this._lockDownMoveCounter = 0;
    this.holdOnce = false;

    if (hasClear) {
      this._animating = true;
    } else {
      this._finishLockDown();
    }
  }

  /** Clear marked rows, update score, and spawn the next piece. */
  private _finishLockDown(): void {
    const clearedLines = this._lineClear();
    const wasB2b = this._calcScore(this._pendingTSpin, clearedLines);

    // Multiplayer garbage offset mechanism
    let outgoing = this._calcGarbageLines(
      this._pendingTSpin,
      clearedLines,
      wasB2b,
    );
    if (outgoing > 0) {
      const cancelled = Math.min(outgoing, this.garbageQueue);
      this.garbageQueue -= cancelled;
      outgoing -= cancelled;
    }

    this._applyIncomingGarbage();
    // send garbage lines to control level
    this._lockDownCallback(outgoing);
    this._generateNewTetrimino();
    this._buildNotice(this._pendingTSpin, clearedLines, wasB2b);
    this._pendingTSpin = 0;
  }

  /** Update score, lines, and level counters after a lock-down. */
  private _calcScore(isTSpin: number, clearedLines: number): boolean {
    const bonus = this._b2bBonus;
    this._b2bBonus = true;

    let awardedLine = 0;
    let score2add = 0;

    if (isTSpin === 1) {
      if (clearedLines === 0) {
        awardedLine = 4;
        score2add = 100 * this.level;
        this._tSpin += 1;
      } else if (clearedLines === 1) {
        awardedLine = 7;
        score2add = 400 * this.level;
        this._tSpinSingle += 1;
      } else if (clearedLines === 2) {
        awardedLine = 10;
        score2add = 1200 * this.level;
        this._tSpinDouble += 1;
      } else if (clearedLines === 3) {
        awardedLine = 13;
        score2add = 1600 * this.level;
        this._tSpinTriple += 1;
      }
    } else if (isTSpin === 2) {
      if (clearedLines === 0) {
        awardedLine = 1;
        score2add = 100 * this.level;
        this._miniTSpin += 1;
      } else if (clearedLines === 1) {
        awardedLine = 2;
        score2add = 200 * this.level;
        this._miniTSpinSingle += 1;
      }
    } else {
      if (clearedLines === 0) {
        // no lines cleared, do not reset b2b
        this._b2bBonus = bonus;
      } else if (clearedLines === 1) {
        score2add = 100 * this.level;
        this._b2bBonus = false;
        this._single += 1;
      } else if (clearedLines === 2) {
        awardedLine = 1;
        score2add = 300 * this.level;
        this._b2bBonus = false;
        this._double += 1;
      } else if (clearedLines === 3) {
        awardedLine = 2;
        score2add = 500 * this.level;
        this._b2bBonus = false;
        this._triple += 1;
      } else if (clearedLines === 4) {
        awardedLine = 4;
        score2add = 800 * this.level;
        this._tetris += 1;
      }
    }

    // if b2b, line clear bonus * 1.5 and score * 1.5
    if (bonus && this._b2bBonus) {
      this._linesForLevel += Math.trunc((awardedLine + clearedLines) * 1.5);
      this.score += Math.trunc(1.5 * score2add);
    } else {
      this._linesForLevel += awardedLine + clearedLines;
      this.score += score2add;
    }

    this.lines += clearedLines;

    if (this._gameMode === GameMode.LINES_150 && this.lines >= 150) {
      this._gameOverCallback("game over!", this._getCurrentSettlement());
      return false;
    }

    if (
      this._gameMode === GameMode.TIME_ATTACK &&
      this._runningSince !== null &&
      (this._elapsedMs + (this._clock.now() - this._runningSince)) / 1000 >=
        this._config.gameRules.timeAttackDuration
    ) {
      this._gameOverCallback("game over!", this._getCurrentSettlement());
      return false;
    }

    // level up
    if (this._linesForLevel >= (5 * this.level * (this.level + 1)) / 2) {
      this.level += 1;
    }

    // endless max level 30
    this.level = Math.min(this.level, 30);

    // max level 15
    if (this._gameMode !== GameMode.ENDLESS && this.level > 15) {
      this.level = 15;
    }

    // if casual or digging mode, max level is 5
    if (
      (this._gameMode === GameMode.CASUAL ||
        this._gameMode === GameMode.DIGGING) &&
      this.level > 5
    ) {
      this.level = 5;
    }

    return bonus;
  }

  /** Calculate garbage lines to send to the opponent. */
  private _calcGarbageLines(
    isTSpin: number,
    clearedLines: number,
    wasB2b: boolean,
  ): number {
    let lines = 0;
    if (isTSpin === 1) {
      if (clearedLines === 1) lines = 2;
      else if (clearedLines === 2) lines = 4;
      else if (clearedLines === 3) lines = 6;
    } else if (isTSpin === 2) {
      // Mini T-Spin — no garbage
      lines = 0;
    } else {
      if (clearedLines === 2) lines = 1;
      else if (clearedLines === 3) lines = 2;
      else if (clearedLines === 4) lines = 4;
    }
    if (lines > 0 && wasB2b) lines += 1;
    return lines;
  }

  /**
   * Inject pending garbage lines from the queue into the board. Each garbage
   * row is pushed from the bottom, shifting everything up. Every group of 8
   * lines shares the same random hole column.
   */
  private _applyIncomingGarbage(): void {
    const width = this._config.gameRules.boardWidth;
    const count = this.garbageQueue;
    this.garbageQueue = 0;

    let col = 0;
    for (let i = 0; i < count; i++) {
      if (i % 8 === 0) col = this._rng.randint(0, width - 1);
      this.board.shift();
      const newLine = new Array<TetriminoShape>(width).fill(
        TetriminoShape.GARBAGE,
      );
      newLine[col] = TetriminoShape.EMPTY;
      this.board.push(newLine);
    }
  }

  /** Build and show the lock-down action notice. */
  private _buildNotice(
    isTSpin: number,
    clearedLines: number,
    wasB2b: boolean,
  ): void {
    let notice = "";
    if (isTSpin === 1) {
      if (clearedLines === 0) notice = "T-Spin!";
      else if (clearedLines === 1) notice = "T-Spin Single!";
      else if (clearedLines === 2) notice = "T-Spin Double!";
      else if (clearedLines === 3) notice = "T-Spin Triple!";
    } else if (isTSpin === 2) {
      if (clearedLines === 0) notice = "T-Spin Mini!";
      else if (clearedLines === 1) notice = "T-Spin Mini Single!";
    } else if (clearedLines === 1) notice = "Single!";
    else if (clearedLines === 2) notice = "Double!";
    else if (clearedLines === 3) notice = "Triple!";
    else if (clearedLines === 4) notice = "Tetris!";

    if (notice) {
      if (this._b2bBonus && wasB2b) notice += " B2B!";
      this._setNotice(notice);
    }
  }

  // ======================================================================
  // per-frame handlers
  // ======================================================================

  private _handleNormalFall(delta: number): void {
    this._normalFallTimer += delta;
    if (this._normalFallTimer < this._fallSpeed) return;
    this._normalFallTimer = 0;
    if (this._moveDown()) {
      this._lastMove = Movement.MOVE;

      // reset lock down timer and counter
      if (this._getCurrentLowest() > this._lowest) {
        this._lockDownTimer = 0;
        this._lowest = this._getCurrentLowest();
      }
      this._lockDownMoveCounter = 0;
    }
  }

  private _handleLineClearAnim(delta: number): void {
    if (this._clearAnimPlayed >= this._config.timing.clearAnimDuration) {
      this._clearAnimPlayed = 0;
      this._animating = false;
      this._finishLockDown();
    }
    this._clearAnimPlayed += delta;
  }

  private _handleLockDown(delta: number): void {
    if (this._checkCanMoveDown()) return;
    // reset when move and rotate successfully
    this._lockDownTimer += delta;
    if (this._lockDownTimer >= LOCK_DOWN_DELAY_SECONDS) this._lockDown();
  }

  /** Project the ghost piece to the lowest valid position. */
  private _handleShadow(): void {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    this.shadow = this.curTetrimino.bodies.map(([x, y]) => [x, y] as Point);

    const canFall = (): boolean => {
      if (this.curTetrimino === null) throw new Error("curTetrimino is null");
      for (const [x, y] of this.shadow) {
        if (x + 1 >= this.board.length) return false;
        if (
          this.curTetrimino.bodies.some(([bx, by]) => bx === x + 1 && by === y)
        ) {
          continue;
        }
        if (this.board[x + 1][y] !== TetriminoShape.EMPTY) return false;
      }
      return true;
    };

    while (canFall()) {
      for (let i = 0; i < this.shadow.length; i++) {
        const [x, y] = this.shadow[i];
        this.shadow[i] = [x + 1, y];
      }
    }
  }

  /** Automatically add garbage rows in Digging mode. */
  private _handleDiggingMode(delta: number): void {
    this._lineIncrementTimer += delta;
    if (
      this._gameMode !== GameMode.DIGGING ||
      this._lineIncrementTimer < this._diggingModeLineIncrementTime
    ) {
      return;
    }
    this._lineIncrementTimer = 0;
    // add one line in the garbage
    this.garbageQueue += 1;
  }

  private _initDiggingMode(): void {
    for (let i = 0; i < 4; i++) {
      this.garbageQueue += 2;
      this._applyIncomingGarbage();
    }
  }

  private _initGame(): void {
    // when versus mode, reset configs about gameplay
    if (this._gameMode === GameMode.VERSUS) {
      const defaults = defaultConfig();
      this._config.timing.clearAnimFlashInterval =
        defaults.timing.clearAnimFlashInterval;
      this._config.timing.clearAnimDuration = defaults.timing.clearAnimDuration;
      this._config.gameRules.maxLockDownMoveCount =
        defaults.gameRules.maxLockDownMoveCount;
    }
    if (this._gameMode === GameMode.DIGGING) this._initDiggingMode();
    this._initBag();
    this._generateNewTetrimino();
  }

  // ======================================================================
  // public interface
  // ======================================================================

  /** Advance game state by `timeDelta` seconds. */
  process(timeDelta: number): void {
    if (this._animating) {
      this._handleLineClearAnim(timeDelta);
    } else {
      this._handleDiggingMode(timeDelta);
      this._handleNormalFall(timeDelta);
      this._handleLockDown(timeDelta);
    }

    this._handleShadow();

    if (
      this._gameMode === GameMode.TIME_ATTACK &&
      this._runningSince !== null &&
      (this._elapsedMs + (this._clock.now() - this._runningSince)) / 1000 >=
        this._config.gameRules.timeAttackDuration
    ) {
      this._gameOverCallback("game over!", this._getCurrentSettlement());
    }
  }

  /** Move the current piece left one cell. */
  doMoveLeft(): boolean {
    if (!this._checkCanMoveLeft()) return false;

    // counter++ reset timer
    this._lockDownMoveCounter += 1;
    this._lockDownTimer = 0;

    this._lastMove = Movement.MOVE;

    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
      const [x, y] = this.curTetrimino.bodies[i];
      this.curTetrimino.bodies[i] = [x, y - 1];
    }
    return true;
  }

  /** Move the current piece right one cell. */
  doMoveRight(): boolean {
    if (!this._checkCanMoveRight()) return false;

    this._lockDownMoveCounter += 1;
    this._lockDownTimer = 0;

    this._lastMove = Movement.MOVE;

    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
      const [x, y] = this.curTetrimino.bodies[i];
      this.curTetrimino.bodies[i] = [x, y + 1];
    }
    return true;
  }

  /** Rotate the current piece clockwise (SRS). */
  doRotateCw(): void {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    const cur = this.curTetrimino.direction;
    const idx = DIRECTIONS.indexOf(cur);
    const next = DIRECTIONS[(idx + 1) % DIRECTIONS.length];
    this._rotate(cur, next);
  }

  /** Rotate the current piece counter-clockwise (SRS). */
  doRotateCcw(): void {
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    const cur = this.curTetrimino.direction;
    const idx = DIRECTIONS.indexOf(cur);
    const next =
      DIRECTIONS[
        (DIRECTIONS.length + (idx - 1)) % DIRECTIONS.length
      ];
    this._rotate(cur, next);
  }

  /** Perform one soft-drop step, awarding 1 x level per cell dropped. */
  doSoftDrop(): void {
    // cancel normal fall
    this._normalFallTimer = 0;
    if (this._moveDown()) {
      // soft drop get level score
      this.score += this.level;
      this._lastMove = Movement.MOVE;

      // reset lock down timer and counter
      if (this._getCurrentLowest() > this._lowest) {
        this._lockDownTimer = 0;
        this._lowest = this._getCurrentLowest();
      }
      this._lockDownMoveCounter = 0;
    }
  }

  /**
   * Instantly drop the piece to the bottom and lock it, awarding
   * 2 x level x rows_dropped.
   */
  doHardDrop(): void {
    while (this._moveDown()) {
      this.score += this.level * 2;
    }
    this._lockDown();
  }

  /** Swap the current piece with the hold piece (once per lock-down cycle). */
  doHold(): void {
    if (this.holdOnce) return;
    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
    this.holdOnce = true;
    for (const [x, y] of this.curTetrimino) {
      this.board[x][y] = TetriminoShape.EMPTY;
    }
    if (this.hold === null) {
      this.hold = this.curTetrimino;
    } else {
      this.bag.appendleft(new Tetrimino(this.hold.shape));
      this.hold = this.curTetrimino;
    }

    this._lockDownMoveCounter = 0;
    this._lockDownTimer = 0;
    this._generateNewTetrimino();
  }

  /** Queue incoming garbage lines from the opponent. */
  addGarbageLines(count: number): void {
    this._setNotice(`Garbage +${count}!`);
    this.garbageQueue += count;
  }

  /** Current action notice, or `""` when none is active. */
  getNotice(): string {
    if (this.paused) return "PAUSED";
    // show notice for 1 second
    if (this._clock.now() - this._noticeTimerMs >= NOTICE_TTL_MS) return "";
    return this._notice;
  }

  /** Export the board as a 2D array of shape values. */
  serializeBoard(): number[][] {
    return this.board.map((row) => row.map((v) => v as number));
  }

  /** Immediately end the game. */
  forcedGameOver(setTitle: string): void {
    this._gameOverCallback(setTitle, this._getCurrentSettlement());
  }

  /** Toggle the pause state (ignored in versus mode). */
  togglePause(): void {
    if (this._gameMode === GameMode.VERSUS) return;
    this.paused = !this.paused;
    if (this.paused) {
      if (this._runningSince !== null) {
        this._elapsedMs += this._clock.now() - this._runningSince;
        this._runningSince = null;
      }
    } else {
      this._runningSince = this._clock.now();
    }
  }

  /** Whether the core should process player input. */
  controllable(): boolean {
    return !(this.paused || this._animating);
  }
}

/** `MM:SS:CC`, mirroring upstream's formatting. */
function formatClock(secondsTotal: number): string {
  const minutes = Math.trunc(secondsTotal / 60);
  const seconds = Math.trunc(secondsTotal % 60);
  const milliseconds = Math.trunc((secondsTotal * 100) % 100);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds)}`;
}
