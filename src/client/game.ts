/**
 * Browser-side game controller: owns one {@link TetrisCore} plus the fixed
 * timestep loop, and adapts keyboard events onto the engine's `do*` API.
 *
 * The controller is deliberately framework-free so it can live in a ref and
 * keep its state across show/hide cycles of the panel.
 */

import {
  GameMode,
  gameModeLabel,
  TetriminoShape,
} from "../core/enums.ts";
import { TetrisCore } from "../core/core.ts";
import type { SettlementMessage } from "../core/settlement.ts";

/** Fixed simulation step, matching upstream's `TimingConfig.fps` of 30. */
export const FIXED_DT = 1 / 30;
/** Clamp a frame delta so a backgrounded tab cannot fast-forward the game. */
const MAX_FRAME_TIME = 0.25;

export type GameOutcome = {
  title: string;
  settlement: SettlementMessage;
};

/** Maps a `KeyboardEvent.key` onto a control action. */
export type Action =
  | "left"
  | "right"
  | "rotateCw"
  | "rotateCcw"
  | "softDrop"
  | "hardDrop"
  | "hold"
  | "pause";

const KEY_MAP: Readonly<Record<string, Action>> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "rotateCw",
  w: "rotateCw",
  W: "rotateCw",
  x: "rotateCw",
  X: "rotateCw",
  z: "rotateCcw",
  Z: "rotateCcw",
  ArrowDown: "softDrop",
  s: "softDrop",
  S: "softDrop",
  " ": "hardDrop",
  c: "hold",
  C: "hold",
  p: "pause",
  P: "pause",
};

const BOUND_KEYS = new Set<string>(Object.keys(KEY_MAP));

/** Resolve a keyboard event to an action, or `undefined` when unbound. */
export function actionForKey(key: string): Action | undefined {
  return KEY_MAP[key];
}

/** Whether a key string is one the game handles (used to stop propagation). */
export function isGameKey(key: string): boolean {
  return BOUND_KEYS.has(key);
}

export class TetrisGame {
  core: TetrisCore;
  gameMode: GameMode;
  /** Mode the menu should preselect, and the mode a fresh wait resumes. */
  lastMode: GameMode;
  /** Whether a game has been explicitly started (via the menu, a reset, or a
   * wait). Used to decide between showing the menu and resuming play. */
  private _started = false;
  outcome: GameOutcome | null = null;
  /** Bumped whenever anything observable changed, for cheap React syncs. */
  revision = 0;

  private frame: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private readonly listeners = new Set<() => void>();

  constructor(gameMode: GameMode = GameMode.ENDLESS) {
    this.gameMode = gameMode;
    this.lastMode = gameMode;
    this.core = this.createCore(gameMode);
  }

  get started(): boolean {
    return this._started;
  }

  /**
   * Start `mode` as a new game and remember it as the default.
   *
   * This is what the menu confirms with, and what a waiting period uses when
   * nothing has been started yet.
   */
  startMode(mode: GameMode): void {
    this.lastMode = mode;
    this.reset(mode);
    this._started = true;
  }

  private createCore(gameMode: GameMode): TetrisCore {
    return new TetrisCore({
      gameMode,
      gameOverCallback: (title, settlement) => {
        this.outcome = { title, settlement };
        this.stop();
        this.notify();
      },
      lockDownCallback: () => {},
    });
  }

  get modeLabel(): string {
    return gameModeLabel(this.gameMode);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }

  /**
   * Start a brand new game (used by the "再来一局" button).
   *
   * The loop is ALWAYS restarted, not merely left alone: a finished game has
   * already stopped it, and leaving it stopped means the new piece never falls
   * (`process` drives both gravity and the ghost), so the board would sit
   * frozen with no shadow.
   */
  reset(gameMode: GameMode = this.gameMode): void {
    this.stop();
    this.gameMode = gameMode;
    this._started = true;
    this.core = this.createCore(gameMode);
    this.outcome = null;
    this.accumulator = 0;
    this.start();
    this.notify();
  }

  /** Whether the simulation loop is currently running. */
  get isRunning(): boolean {
    return this.frame !== null;
  }

  /** Start the fixed-timestep loop. Idempotent. */
  start(): void {
    if (this.frame !== null) return;
    if (this.outcome !== null) return;
    this.lastTime = performance.now() / 1000;
    this.accumulator = 0;
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Stop the loop, preserving all game state. Idempotent. */
  stop(): void {
    if (this.frame === null) return;
    cancelAnimationFrame(this.frame);
    this.frame = null;
    this.notify();
  }

  /**
   * Pause or resume the engine. Uses an explicit desired state because
   * upstream only exposes `togglePause()`, and a blind toggle would invert a
   * pause the player asked for.
   */
  setPaused(paused: boolean): void {
    if (this.core.paused === paused) return;
    this.core.togglePause();
    this.notify();
  }

  get paused(): boolean {
    return this.core.paused || this.outcome !== null;
  }

  /**
   * Apply one control action to the engine.
   *
   * There is deliberately no "quit" action: the Web panel owns restarting and
   * closing with real buttons, so an engine-ending hotkey would only be a way
   * to lose a game by accident.
   */
  dispatch(action: Action): void {
    if (this.outcome !== null) return;
    const core = this.core;

    switch (action) {
      case "pause":
        core.togglePause();
        break;
      default: {
        if (!core.controllable()) return;
        switch (action) {
          case "left":
            core.doMoveLeft();
            break;
          case "right":
            core.doMoveRight();
            break;
          case "rotateCw":
            core.doRotateCw();
            break;
          case "rotateCcw":
            core.doRotateCcw();
            break;
          case "softDrop":
            core.doSoftDrop();
            break;
          case "hardDrop":
            core.doHardDrop();
            break;
          case "hold":
            core.doHold();
            break;
        }
      }
    }
    this.notify();
  }

  /** The five upcoming shapes, mirroring upstream's preview panel. */
  nextShapes(count = 5): TetriminoShape[] {
    const bag = this.core.bag.toArray();
    const out: TetriminoShape[] = [];
    for (let i = 0; i < count && i < bag.length; i++) out.push(bag[i].shape);
    return out;
  }

  private readonly tick = (): void => {
    this.frame = requestAnimationFrame(this.tick);

    const now = performance.now() / 1000;
    let frameTime = now - this.lastTime;
    this.lastTime = now;
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

    if (!this.core.paused) {
      this.accumulator += frameTime;
      while (this.accumulator >= FIXED_DT) {
        this.core.process(FIXED_DT);
        this.accumulator -= FIXED_DT;
        if (this.outcome !== null) break;
      }
    }

    this.notify();
  };
}
