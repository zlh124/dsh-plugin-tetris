window.__ModuleLoader__.load({
	id: "dsh-plugin-tetris",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
		  // If the importer is in node compatibility mode or this is not an ESM
		  // file that has been converted to a CommonJS file using a Babel-
		  // compatible transform (i.e. "__esModule" has not been set), then set
		  // "default" to the CommonJS "module.exports" for node compatibility.
		  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
		  mod
		));
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

		// src/client/index.tsx
		var index_exports = {};
		__export(index_exports, {
		  TetrisDock: () => TetrisDock,
		  apply: () => apply,
		  inject: () => inject
		});
		module.exports = __toCommonJS(index_exports);
		var React2 = __toESM(require("react"), 1);

		// src/core/enums.ts
		var NORMAL_TETRIMINOS = [
		  1 /* Z */,
		  2 /* S */,
		  3 /* O */,
		  4 /* J */,
		  5 /* T */,
		  6 /* I */,
		  7 /* L */
		];
		var DIRECTIONS = [
		  1 /* NORTH */,
		  2 /* EAST */,
		  4 /* SOUTH */,
		  8 /* WEST */
		];
		function gameModeLabel(mode) {
		  switch (mode) {
		    case 0 /* LINES_150 */:
		      return "150 LINES";
		    case 1 /* CASUAL */:
		      return "CASUAL";
		    case 2 /* ENDLESS */:
		      return "ENDLESS";
		    case 3 /* DIGGING */:
		      return "DIGGING";
		    case 4 /* TIME_ATTACK */:
		      return "TIME ATTACK";
		    case 5 /* VERSUS */:
		      return "VERSUS";
		  }
		}

		// src/core/clock.ts
		var systemClock = {
		  now: () => Date.now()
		};

		// src/core/config.ts
		function defaultConfig() {
		  return {
		    gameRules: {
		      boardWidth: 10,
		      boardHeight: 40,
		      maxLockDownMoveCount: 15,
		      timeAttackDuration: 120
		    },
		    timing: {
		      fps: 30,
		      clearAnimFlashInterval: 0.05,
		      clearAnimDuration: 0.3
		    }
		  };
		}

		// src/core/constants.ts
		var SHAPE_TABLE = {
		  [0 /* EMPTY */]: [],
		  [1 /* Z */]: [
		    [0, 0],
		    [0, 1],
		    [1, 1],
		    [1, 2]
		  ],
		  [2 /* S */]: [
		    [0, 0],
		    [0, 1],
		    [-1, 1],
		    [-1, 2]
		  ],
		  [3 /* O */]: [
		    [0, 0],
		    [0, 1],
		    [1, 0],
		    [1, 1]
		  ],
		  [4 /* J */]: [
		    [0, 0],
		    [1, 0],
		    [1, 1],
		    [1, 2]
		  ],
		  [5 /* T */]: [
		    [0, 0],
		    [0, 1],
		    [-1, 1],
		    [0, 2]
		  ],
		  [6 /* I */]: [
		    [0, 0],
		    [0, 1],
		    [0, 2],
		    [0, 3]
		  ],
		  [7 /* L */]: [
		    [0, 0],
		    [0, 1],
		    [0, 2],
		    [-1, 2]
		  ],
		  [8 /* GARBAGE */]: [],
		  [9 /* CLEAR */]: []
		};
		var ROTATE_AXIS = {
		  [0 /* EMPTY */]: [0, 0],
		  [1 /* Z */]: [1, 1],
		  [2 /* S */]: [0, 1],
		  [3 /* O */]: [
		    [0, 1],
		    [0, 1]
		  ],
		  [4 /* J */]: [1, 1],
		  [5 /* T */]: [0, 1],
		  [6 /* I */]: [
		    [0, 1],
		    [1, 2]
		  ],
		  [7 /* L */]: [0, 1],
		  [8 /* GARBAGE */]: [0, 0],
		  [9 /* CLEAR */]: [0, 0]
		};
		var SHOW_OFFSET = {
		  [0 /* EMPTY */]: [0, 0],
		  [1 /* Z */]: [1, 0],
		  [2 /* S */]: [2, 0],
		  [3 /* O */]: [1, 0],
		  [4 /* J */]: [1, 0],
		  [5 /* T */]: [2, 0],
		  [6 /* I */]: [1, 0],
		  [7 /* L */]: [2, 0],
		  [8 /* GARBAGE */]: [0, 0],
		  [9 /* CLEAR */]: [0, 0]
		};
		var GENERATE_POSITION = {
		  [0 /* EMPTY */]: [0, 0],
		  [1 /* Z */]: [18, 3],
		  [2 /* S */]: [19, 3],
		  [3 /* O */]: [18, 4],
		  [4 /* J */]: [18, 3],
		  [5 /* T */]: [19, 3],
		  [6 /* I */]: [19, 3],
		  [7 /* L */]: [19, 3],
		  [8 /* GARBAGE */]: [0, 0],
		  [9 /* CLEAR */]: [0, 0]
		};
		var JLSTZ_WALL_KICK_OFFSET = {
		  "1,2": [
		    [0, 0],
		    [0, -1],
		    [-1, -1],
		    [2, 0],
		    [2, -1]
		  ],
		  // N->E
		  "2,1": [
		    [0, 0],
		    [0, 1],
		    [1, 1],
		    [-2, 0],
		    [-2, 1]
		  ],
		  // E->N
		  "2,4": [
		    [0, 0],
		    [0, 1],
		    [1, 1],
		    [-2, 0],
		    [-2, 1]
		  ],
		  // E->S
		  "4,2": [
		    [0, 0],
		    [0, -1],
		    [-1, -1],
		    [2, 0],
		    [2, -1]
		  ],
		  // S->E
		  "4,8": [
		    [0, 0],
		    [0, 1],
		    [-1, 1],
		    [2, 0],
		    [2, 1]
		  ],
		  // S->W
		  "8,4": [
		    [0, 0],
		    [0, -1],
		    [1, -1],
		    [-2, 0],
		    [-2, -1]
		  ],
		  // W->S
		  "8,1": [
		    [0, 0],
		    [0, -1],
		    [1, -1],
		    [-2, 0],
		    [-2, -1]
		  ],
		  // W->N
		  "1,8": [
		    [0, 0],
		    [0, 1],
		    [-1, 1],
		    [2, 0],
		    [2, 1]
		  ]
		  // N->W
		};
		var O_WALL_KICK_OFFSET = {
		  "1,2": [[0, 0]],
		  "2,1": [[0, 0]],
		  "2,4": [[0, 0]],
		  "4,2": [[0, 0]],
		  "4,8": [[0, 0]],
		  "8,4": [[0, 0]],
		  "8,1": [[0, 0]],
		  "1,8": [[0, 0]]
		};
		var I_WALL_KICK_OFFSET = {
		  "1,2": [
		    [0, 0],
		    [0, -2],
		    [0, 1],
		    [1, -2],
		    [-2, 1]
		  ],
		  // N->E
		  "2,1": [
		    [0, 0],
		    [0, 2],
		    [0, -1],
		    [-1, 2],
		    [2, -1]
		  ],
		  // E->N
		  "2,4": [
		    [0, 0],
		    [0, -1],
		    [0, 2],
		    [-2, -1],
		    [1, 2]
		  ],
		  // E->S
		  "4,2": [
		    [0, 0],
		    [0, 1],
		    [0, -2],
		    [2, 1],
		    [-1, -2]
		  ],
		  // S->E
		  "4,8": [
		    [0, 0],
		    [0, 2],
		    [0, -1],
		    [-1, 2],
		    [2, -1]
		  ],
		  // S->W
		  "8,4": [
		    [0, 0],
		    [0, -2],
		    [0, 1],
		    [1, -2],
		    [-2, 1]
		  ],
		  // W->S
		  "8,1": [
		    [0, 0],
		    [0, 1],
		    [0, -2],
		    [2, 1],
		    [-1, -2]
		  ],
		  // W->N
		  "1,8": [
		    [0, 0],
		    [0, -1],
		    [0, 2],
		    [-2, -1],
		    [1, 2]
		  ]
		  // N->W
		};
		function rotationKey(start, end) {
		  return `${start},${end}`;
		}
		function rotatePoints(points, center, ccw = false) {
		  let cr;
		  let cc;
		  if (typeof center[0] === "number") {
		    const axis = center;
		    cr = axis[0];
		    cc = axis[1];
		  } else {
		    const [rows, cols] = center;
		    cr = (rows[0] + rows[1]) / 2;
		    cc = (cols[0] + cols[1]) / 2;
		  }
		  const out = [];
		  for (const [r, c] of points) {
		    const relR = r - cr;
		    const relC = c - cc;
		    const newRelR = ccw ? -relC : relC;
		    const newRelC = ccw ? relR : -relR;
		    out.push([Math.trunc(newRelR + cr), Math.trunc(newRelC + cc)]);
		  }
		  return out;
		}
		var ROTATE_TABLE = /* @__PURE__ */ new Map();
		for (const shape of NORMAL_TETRIMINOS) {
		  const dirs = DIRECTIONS;
		  const cw = [];
		  for (let i = 0; i < dirs.length; i++) {
		    cw.push([dirs[i], dirs[(i + 1) % dirs.length], false]);
		  }
		  const ccwTransitions = [];
		  for (let i = 0; i < dirs.length; i++) {
		    const idx = -i;
		    const start = dirs[(idx % dirs.length + dirs.length) % dirs.length];
		    const endIdx = ((dirs.length + (idx - 1)) % dirs.length + dirs.length) % dirs.length;
		    ccwTransitions.push([start, dirs[endIdx], true]);
		  }
		  let curPos = SHAPE_TABLE[shape].map((p) => [p[0], p[1]]);
		  const table = /* @__PURE__ */ new Map();
		  ROTATE_TABLE.set(shape, table);
		  for (const [start, end, isCcw] of [...cw, ...ccwTransitions]) {
		    const rotated = rotatePoints(curPos, ROTATE_AXIS[shape], isCcw);
		    const diff = rotated.map(([rx, ry], i) => [
		      rx - curPos[i][0],
		      ry - curPos[i][1]
		    ]);
		    curPos = rotated;
		    const key = rotationKey(start, end);
		    const offsets = shape === 6 /* I */ ? I_WALL_KICK_OFFSET[key] : shape === 3 /* O */ ? O_WALL_KICK_OFFSET[key] : JLSTZ_WALL_KICK_OFFSET[key];
		    table.set(key, { standardRotateDiff: diff, offsets });
		  }
		}
		function rotationEntry(shape, start, end) {
		  return ROTATE_TABLE.get(shape)?.get(rotationKey(start, end));
		}

		// src/core/deque.ts
		var BoundedDeque = class {
		  items = [];
		  maxlen;
		  constructor(maxlen) {
		    this.maxlen = maxlen;
		  }
		  get length() {
		    return this.items.length;
		  }
		  append(value) {
		    this.items.push(value);
		    this.truncate();
		  }
		  appendleft(value) {
		    this.items.unshift(value);
		    this.truncate();
		  }
		  extend(values) {
		    for (const v of values) this.append(v);
		  }
		  popleft() {
		    const value = this.items.shift();
		    if (value === void 0) throw new Error("popleft from an empty deque");
		    return value;
		  }
		  at(index) {
		    return this.items[index];
		  }
		  toArray() {
		    return this.items;
		  }
		  truncate() {
		    while (this.items.length > this.maxlen) {
		      this.items.pop();
		    }
		  }
		};

		// src/core/rng.ts
		function seededRng(seed) {
		  let state = seed >>> 0;
		  const next = () => {
		    state = state + 1831565813 >>> 0;
		    let t = state;
		    t = Math.imul(t ^ t >>> 15, t | 1);
		    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		    return ((t ^ t >>> 14) >>> 0) / 4294967296;
		  };
		  return {
		    shuffle(items) {
		      for (let i = items.length - 1; i > 0; i--) {
		        const j = Math.floor(next() * (i + 1));
		        const tmp = items[i];
		        items[i] = items[j];
		        items[j] = tmp;
		      }
		    },
		    randint(min, max) {
		      return min + Math.floor(next() * (max - min + 1));
		    }
		  };
		}
		var systemRng = {
		  shuffle(items) {
		    for (let i = items.length - 1; i > 0; i--) {
		      const j = Math.floor(Math.random() * (i + 1));
		      const tmp = items[i];
		      items[i] = items[j];
		      items[j] = tmp;
		    }
		  },
		  randint(min, max) {
		    return min + Math.floor(Math.random() * (max - min + 1));
		  }
		};

		// src/core/settlement.ts
		var SettlementMessage = class {
		  title;
		  score;
		  lines;
		  time;
		  single;
		  double;
		  triple;
		  tetris;
		  tSpin;
		  tSpinSingle;
		  tSpinDouble;
		  tSpinTriple;
		  miniTSpin;
		  miniTSpinSingle;
		  gameMode;
		  constructor(title, fields) {
		    this.title = title;
		    this.score = fields.score;
		    this.lines = fields.lines;
		    this.time = fields.time;
		    this.single = fields.single;
		    this.double = fields.double;
		    this.triple = fields.triple;
		    this.tetris = fields.tetris;
		    this.tSpin = fields.tSpin;
		    this.tSpinSingle = fields.tSpinSingle;
		    this.tSpinDouble = fields.tSpinDouble;
		    this.tSpinTriple = fields.tSpinTriple;
		    this.miniTSpin = fields.miniTSpin;
		    this.miniTSpinSingle = fields.miniTSpinSingle;
		    this.gameMode = fields.gameMode;
		  }
		  /** Format all statistics into centred lines fitting within `width`. */
		  format(width) {
		    const harfw = width >> 1;
		    const msgs = [];
		    if (this.gameMode) msgs.push(`Mode: ${this.gameMode}`);
		    msgs.push(
		      `Score: ${this.score}`,
		      `Lines: ${this.lines}`,
		      `Time: ${this.time}`,
		      `Single: ${this.single}`,
		      `Double: ${this.double}`,
		      `Triple: ${this.triple}`,
		      `Tetris: ${this.tetris}`,
		      `T-Spin: ${this.tSpin}`,
		      `T-Spin Single: ${this.tSpinSingle}`,
		      `T-Spin Double: ${this.tSpinDouble}`,
		      `T-Spin Triple: ${this.tSpinTriple}`,
		      `Mini-T-Spin: ${this.miniTSpin}`,
		      `Mini-T-Spin Single: ${this.miniTSpinSingle}`
		    );
		    const centre = (text, size) => {
		      if (text.length >= size) return text;
		      const total = size - text.length;
		      const left = Math.floor(total / 2);
		      return " ".repeat(left) + text + " ".repeat(total - left);
		    };
		    const res = [];
		    let i = 0;
		    let curLine = "";
		    while (i < msgs.length) {
		      if (curLine.length + harfw > width || msgs[i].length > harfw) {
		        if (curLine === "" && msgs[i].length > harfw) {
		          res.push(centre(msgs[i], width));
		          i += 1;
		          continue;
		        }
		        res.push(centre(curLine, width));
		        curLine = "";
		      } else {
		        curLine += centre(msgs[i], harfw);
		        i += 1;
		      }
		      if (i === msgs.length) res.push(centre(curLine, width));
		    }
		    return res;
		  }
		};

		// src/core/core.ts
		var BUFFER_ROWS = 20;
		var LOCK_DOWN_DELAY_SECONDS = 0.5;
		var NOTICE_TTL_MS = 1e3;
		var BAG_CYCLE = 7;
		var BAG_MAXLEN = 14;
		var Tetrimino = class {
		  /** Current orientation of the piece. */
		  direction = 1 /* NORTH */;
		  /** Numeric shape value (same as `shape`). */
		  no;
		  /** The tetrimino shape identifier. */
		  shape;
		  /** List of `[row, col]` cells occupied by this piece. */
		  bodies;
		  constructor(shape) {
		    this.no = shape;
		    this.shape = shape;
		    const [dx, dy] = GENERATE_POSITION[shape];
		    this.bodies = SHAPE_TABLE[shape].map(
		      ([x, y]) => [x + dx, y + dy]
		    );
		  }
		  [Symbol.iterator]() {
		    return this.bodies[Symbol.iterator]();
		  }
		};
		var TetrisCore = class {
		  _gameMode;
		  _config;
		  _lockDownCallback;
		  _gameOverCallback;
		  _rng;
		  _clock;
		  _nextTetrimino;
		  // Multiplayer
		  garbageQueue = 0;
		  // Score / progress
		  score = 0;
		  lines = 0;
		  level = 1;
		  _elapsedMs = 0;
		  _runningSince;
		  _linesForLevel = 0;
		  // settlement
		  _single = 0;
		  _double = 0;
		  _triple = 0;
		  _tetris = 0;
		  _tSpin = 0;
		  _tSpinSingle = 0;
		  _tSpinDouble = 0;
		  _tSpinTriple = 0;
		  _miniTSpin = 0;
		  _miniTSpinSingle = 0;
		  // Game flow
		  paused = false;
		  _animating = false;
		  _clearAnimPlayed = 0;
		  _pendingTSpin = 0;
		  // Piece state
		  curTetrimino = null;
		  hold = null;
		  holdOnce = false;
		  // Timers
		  frameTimer = 0;
		  _normalFallTimer = 0;
		  _lineIncrementTimer = 0;
		  _lockDownTimer = 0;
		  _noticeTimerMs = 0;
		  // Lock-down tracking
		  _lockDownMoveCounter = 0;
		  _lowest = 0;
		  // Combo / T-Spin tracking
		  _b2bBonus = false;
		  _lastMove = 0 /* MOVE */;
		  _rotateOffset = 0;
		  // Notice
		  _notice = "";
		  // Board, bag, shadow
		  board;
		  shadow = [];
		  bag;
		  constructor(options) {
		    this._gameMode = options.gameMode;
		    this._config = options.config ?? defaultConfig();
		    this._lockDownCallback = options.lockDownCallback ?? (() => {
		    });
		    this._gameOverCallback = options.gameOverCallback ?? (() => {
		    });
		    this._rng = options.rng ?? (options.seed !== void 0 ? seededRng(options.seed) : systemRng);
		    this._clock = options.clock ?? systemClock;
		    if (options.tetriminoGenerator !== void 0) {
		      this._nextTetrimino = options.tetriminoGenerator;
		    } else {
		      let queue = [];
		      this._nextTetrimino = () => {
		        if (queue.length === 0) {
		          queue = NORMAL_TETRIMINOS.map((s) => new Tetrimino(s));
		          this._rng.shuffle(queue);
		        }
		        return queue.shift();
		      };
		    }
		    this._runningSince = this._clock.now();
		    this.board = Array.from(
		      { length: this._config.gameRules.boardHeight },
		      () => new Array(this._config.gameRules.boardWidth).fill(
		        0 /* EMPTY */
		      )
		    );
		    this.bag = new BoundedDeque(BAG_MAXLEN);
		    this._initGame();
		  }
		  // ======================================================================
		  // properties
		  // ======================================================================
		  get gameRules() {
		    return this._config.gameRules;
		  }
		  get timing() {
		    return this._config.timing;
		  }
		  get gameMode() {
		    return this._gameMode;
		  }
		  /** Elapsed game time in seconds (pauses excluded). */
		  get gameTime() {
		    const elapsed = this._runningSince !== null ? this._elapsedMs + (this._clock.now() - this._runningSince) : this._elapsedMs;
		    return elapsed / 1e3;
		  }
		  /** Elapsed game time formatted as `MM:SS:CC`. */
		  get gameTimeStr() {
		    return formatClock(this.gameTime);
		  }
		  /** Countdown for Time Attack mode, formatted as `MM:SS:CC`. */
		  get timeRemaining() {
		    const elapsedMs = this._runningSince !== null ? this._elapsedMs + (this._clock.now() - this._runningSince) : this._elapsedMs;
		    const remaining = this._config.gameRules.timeAttackDuration - elapsedMs / 1e3;
		    if (remaining <= 0) return "00:00:00";
		    return formatClock(remaining);
		  }
		  /** Current normal-fall interval in seconds (standard guideline formula). */
		  get _fallSpeed() {
		    return (0.8 - (this.level - 1) * 7e-3) ** (this.level - 1);
		  }
		  /** The time for digging mode to increase one line. */
		  get _diggingModeLineIncrementTime() {
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
		  _replenishBag() {
		    for (let i = 0; i < BAG_CYCLE; i++) {
		      this.bag.append(this._nextTetrimino());
		    }
		  }
		  /** Fill the bag with two cycles (14 pieces) at game start. */
		  _initBag() {
		    for (let i = 0; i < 2; i++) this._replenishBag();
		  }
		  /** Pop the next piece from the bag, replenishing when it drops to 7. */
		  _getTetrimino() {
		    const tetrimino = this.bag.popleft();
		    if (this.bag.length === BAG_CYCLE) this._replenishBag();
		    return tetrimino;
		  }
		  /** Bottom-most row occupied by the current piece. */
		  _getCurrentLowest() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    let lowest = -Infinity;
		    for (const [x] of this.curTetrimino) if (x > lowest) lowest = x;
		    return lowest;
		  }
		  /** Build a settlement message from the current counters. */
		  _getCurrentSettlement() {
		    const fields = {
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
		      gameMode: gameModeLabel(this._gameMode)
		    };
		    return new SettlementMessage("", fields);
		  }
		  /**
		   * Spawn the next piece. If the spawn position is blocked the game-over
		   * callback is invoked immediately.
		   */
		  _generateNewTetrimino() {
		    this.curTetrimino = this._getTetrimino();
		    for (const [x, y] of this.curTetrimino) {
		      if (this.board[x][y] !== 0 /* EMPTY */) {
		        this._gameOverCallback("game over!", this._getCurrentSettlement());
		        return;
		      }
		    }
		    this._moveDown();
		  }
		  /** Remove all fully-filled rows; returns the number of rows cleared. */
		  _lineClear() {
		    let res = 0;
		    for (let row = this._config.gameRules.boardHeight - 1; row >= 0; row--) {
		      while (this.board[row].every((v) => v !== 0 /* EMPTY */)) {
		        res += 1;
		        for (let i = row - 1; i >= 0; i--) {
		          this.board[i + 1] = this.board[i];
		        }
		        this.board[0] = new Array(
		          this._config.gameRules.boardWidth
		        ).fill(0 /* EMPTY */);
		      }
		    }
		    return res;
		  }
		  // ======================================================================
		  // collision
		  // ======================================================================
		  _checkCanMoveDown() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (const [x, y] of this.curTetrimino) {
		      if (x + 1 >= this._config.gameRules.boardHeight || this.board[x + 1][y] !== 0 /* EMPTY */) {
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
		  _checkCanMoveLeft() {
		    if (this._lockDownMoveCounter >= this._config.gameRules.maxLockDownMoveCount) {
		      return false;
		    }
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (const [x, y] of this.curTetrimino) {
		      if (y - 1 < 0 || this.board[x][y - 1] !== 0 /* EMPTY */) {
		        return false;
		      }
		    }
		    return true;
		  }
		  /** Whether the current piece can move right (same counter quirk as left). */
		  _checkCanMoveRight() {
		    if (this._lockDownMoveCounter >= this._config.gameRules.maxLockDownMoveCount) {
		      return false;
		    }
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (const [x, y] of this.curTetrimino) {
		      if (y + 1 >= this._config.gameRules.boardWidth || this.board[x][y + 1] !== 0 /* EMPTY */) {
		        return false;
		      }
		    }
		    return true;
		  }
		  /** Whether `point` is within bounds and empty. */
		  _checkPointEmpty(point) {
		    const [x, y] = point;
		    return x >= 0 && x < this._config.gameRules.boardHeight && y >= 0 && y < this._config.gameRules.boardWidth && this.board[x][y] === 0 /* EMPTY */;
		  }
		  _checkPointsEmpty(points) {
		    return points.every((p) => this._checkPointEmpty(p));
		  }
		  // ======================================================================
		  // movement primitives
		  // ======================================================================
		  /** Rotate the current piece using SRS wall-kick offsets. */
		  _rotate(curDirection, nextDirection) {
		    if (this._lockDownMoveCounter >= this._config.gameRules.maxLockDownMoveCount) {
		      return;
		    }
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    const entry = rotationEntry(
		      this.curTetrimino.shape,
		      curDirection,
		      nextDirection
		    );
		    if (entry === void 0) return;
		    const rotated = this.curTetrimino.bodies.map(([x, y], i) => {
		      const [dx, dy] = entry.standardRotateDiff[i];
		      return [x + dx, y + dy];
		    });
		    for (let i = 0; i < entry.offsets.length; i++) {
		      const [dx, dy] = entry.offsets[i];
		      const tmp = rotated.map(([x, y]) => [x + dx, y + dy]);
		      if (this._checkPointsEmpty(tmp)) {
		        this.curTetrimino.bodies = tmp;
		        this.curTetrimino.direction = nextDirection;
		        this._lastMove = 1 /* ROTATE */;
		        this._lockDownMoveCounter += 1;
		        this._lockDownTimer = 0;
		        this._rotateOffset = i;
		        return;
		      }
		    }
		  }
		  /** Move the current piece down one row. */
		  _moveDown() {
		    if (!this._checkCanMoveDown()) return false;
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
		      const [x, y] = this.curTetrimino.bodies[i];
		      this.curTetrimino.bodies[i] = [x + 1, y];
		    }
		    return true;
		  }
		  _setNotice(notice) {
		    this._notice = notice;
		    this._noticeTimerMs = this._clock.now();
		  }
		  /**
		   * Detect T-Spin status on lock-down. A T-Spin is when the T-piece was
		   * rotated last, and at least 3 of the 4 corner cells are blocked.
		   *
		   * @returns `0` none, `1` full T-Spin, `2` Mini T-Spin.
		   */
		  _isTSpin() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    if (this.curTetrimino.shape !== 5 /* T */ || this._lastMove !== 1 /* ROTATE */) {
		      return 0;
		    }
		    const [cx, cy] = this.curTetrimino.bodies[1];
		    let corners = 0;
		    for (const p of [
		      [cx - 1, cy - 1],
		      [cx + 1, cy - 1],
		      [cx - 1, cy + 1],
		      [cx + 1, cy + 1]
		    ]) {
		      if (!this._checkPointEmpty(p)) corners += 1;
		    }
		    if (corners < 3) return 0;
		    if (this._rotateOffset === 4) return 1;
		    let slots = [];
		    if (this.curTetrimino.direction === 1 /* NORTH */) {
		      slots = [
		        [cx - 1, cy - 1],
		        [cx - 1, cy + 1]
		      ];
		    }
		    if (this.curTetrimino.direction === 2 /* EAST */) {
		      slots = [
		        [cx - 1, cy + 1],
		        [cx + 1, cy + 1]
		      ];
		    }
		    if (this.curTetrimino.direction === 4 /* SOUTH */) {
		      slots = [
		        [cx + 1, cy - 1],
		        [cx + 1, cy + 1]
		      ];
		    }
		    if (this.curTetrimino.direction === 8 /* WEST */) {
		      slots = [
		        [cx - 1, cy - 1],
		        [cx + 1, cy - 1]
		      ];
		    }
		    return slots.every((p) => !this._checkPointEmpty(p)) ? 1 : 2;
		  }
		  /** Lock the current piece onto the board. */
		  _lockDown() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    if (this.curTetrimino.bodies.every(([x]) => x < BUFFER_ROWS)) {
		      this._gameOverCallback("game over!", this._getCurrentSettlement());
		      return;
		    }
		    for (const [x, y] of this.curTetrimino) {
		      this.board[x][y] = this.curTetrimino.shape;
		    }
		    this._pendingTSpin = this._isTSpin();
		    let hasClear = false;
		    for (let row = this._config.gameRules.boardHeight - 1; row >= 0; row--) {
		      if (this.board[row].every((v) => v !== 0 /* EMPTY */)) {
		        for (let col = 0; col < this._config.gameRules.boardWidth; col++) {
		          this.board[row][col] = 9 /* CLEAR */;
		        }
		        hasClear = true;
		      }
		    }
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
		  _finishLockDown() {
		    const clearedLines = this._lineClear();
		    const wasB2b = this._calcScore(this._pendingTSpin, clearedLines);
		    let outgoing = this._calcGarbageLines(
		      this._pendingTSpin,
		      clearedLines,
		      wasB2b
		    );
		    if (outgoing > 0) {
		      const cancelled = Math.min(outgoing, this.garbageQueue);
		      this.garbageQueue -= cancelled;
		      outgoing -= cancelled;
		    }
		    this._applyIncomingGarbage();
		    this._lockDownCallback(outgoing);
		    this._generateNewTetrimino();
		    this._buildNotice(this._pendingTSpin, clearedLines, wasB2b);
		    this._pendingTSpin = 0;
		  }
		  /** Update score, lines, and level counters after a lock-down. */
		  _calcScore(isTSpin, clearedLines) {
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
		    if (bonus && this._b2bBonus) {
		      this._linesForLevel += Math.trunc((awardedLine + clearedLines) * 1.5);
		      this.score += Math.trunc(1.5 * score2add);
		    } else {
		      this._linesForLevel += awardedLine + clearedLines;
		      this.score += score2add;
		    }
		    this.lines += clearedLines;
		    if (this._gameMode === 0 /* LINES_150 */ && this.lines >= 150) {
		      this._gameOverCallback("game over!", this._getCurrentSettlement());
		      return false;
		    }
		    if (this._gameMode === 4 /* TIME_ATTACK */ && this._runningSince !== null && (this._elapsedMs + (this._clock.now() - this._runningSince)) / 1e3 >= this._config.gameRules.timeAttackDuration) {
		      this._gameOverCallback("game over!", this._getCurrentSettlement());
		      return false;
		    }
		    if (this._linesForLevel >= 5 * this.level * (this.level + 1) / 2) {
		      this.level += 1;
		    }
		    this.level = Math.min(this.level, 30);
		    if (this._gameMode !== 2 /* ENDLESS */ && this.level > 15) {
		      this.level = 15;
		    }
		    if ((this._gameMode === 1 /* CASUAL */ || this._gameMode === 3 /* DIGGING */) && this.level > 5) {
		      this.level = 5;
		    }
		    return bonus;
		  }
		  /** Calculate garbage lines to send to the opponent. */
		  _calcGarbageLines(isTSpin, clearedLines, wasB2b) {
		    let lines = 0;
		    if (isTSpin === 1) {
		      if (clearedLines === 1) lines = 2;
		      else if (clearedLines === 2) lines = 4;
		      else if (clearedLines === 3) lines = 6;
		    } else if (isTSpin === 2) {
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
		  _applyIncomingGarbage() {
		    const width = this._config.gameRules.boardWidth;
		    const count = this.garbageQueue;
		    this.garbageQueue = 0;
		    let col = 0;
		    for (let i = 0; i < count; i++) {
		      if (i % 8 === 0) col = this._rng.randint(0, width - 1);
		      this.board.shift();
		      const newLine = new Array(width).fill(
		        8 /* GARBAGE */
		      );
		      newLine[col] = 0 /* EMPTY */;
		      this.board.push(newLine);
		    }
		  }
		  /** Build and show the lock-down action notice. */
		  _buildNotice(isTSpin, clearedLines, wasB2b) {
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
		  _handleNormalFall(delta) {
		    this._normalFallTimer += delta;
		    if (this._normalFallTimer < this._fallSpeed) return;
		    this._normalFallTimer = 0;
		    if (this._moveDown()) {
		      this._lastMove = 0 /* MOVE */;
		      if (this._getCurrentLowest() > this._lowest) {
		        this._lockDownTimer = 0;
		        this._lowest = this._getCurrentLowest();
		      }
		      this._lockDownMoveCounter = 0;
		    }
		  }
		  _handleLineClearAnim(delta) {
		    if (this._clearAnimPlayed >= this._config.timing.clearAnimDuration) {
		      this._clearAnimPlayed = 0;
		      this._animating = false;
		      this._finishLockDown();
		    }
		    this._clearAnimPlayed += delta;
		  }
		  _handleLockDown(delta) {
		    if (this._checkCanMoveDown()) return;
		    this._lockDownTimer += delta;
		    if (this._lockDownTimer >= LOCK_DOWN_DELAY_SECONDS) this._lockDown();
		  }
		  /** Project the ghost piece to the lowest valid position. */
		  _handleShadow() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    this.shadow = this.curTetrimino.bodies.map(([x, y]) => [x, y]);
		    const canFall = () => {
		      if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		      for (const [x, y] of this.shadow) {
		        if (x + 1 >= this.board.length) return false;
		        if (this.curTetrimino.bodies.some(([bx, by]) => bx === x + 1 && by === y)) {
		          continue;
		        }
		        if (this.board[x + 1][y] !== 0 /* EMPTY */) return false;
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
		  _handleDiggingMode(delta) {
		    this._lineIncrementTimer += delta;
		    if (this._gameMode !== 3 /* DIGGING */ || this._lineIncrementTimer < this._diggingModeLineIncrementTime) {
		      return;
		    }
		    this._lineIncrementTimer = 0;
		    this.garbageQueue += 1;
		  }
		  _initDiggingMode() {
		    for (let i = 0; i < 4; i++) {
		      this.garbageQueue += 2;
		      this._applyIncomingGarbage();
		    }
		  }
		  _initGame() {
		    if (this._gameMode === 5 /* VERSUS */) {
		      const defaults = defaultConfig();
		      this._config.timing.clearAnimFlashInterval = defaults.timing.clearAnimFlashInterval;
		      this._config.timing.clearAnimDuration = defaults.timing.clearAnimDuration;
		      this._config.gameRules.maxLockDownMoveCount = defaults.gameRules.maxLockDownMoveCount;
		    }
		    if (this._gameMode === 3 /* DIGGING */) this._initDiggingMode();
		    this._initBag();
		    this._generateNewTetrimino();
		  }
		  // ======================================================================
		  // public interface
		  // ======================================================================
		  /** Advance game state by `timeDelta` seconds. */
		  process(timeDelta) {
		    if (this._animating) {
		      this._handleLineClearAnim(timeDelta);
		    } else {
		      this._handleDiggingMode(timeDelta);
		      this._handleNormalFall(timeDelta);
		      this._handleLockDown(timeDelta);
		    }
		    this._handleShadow();
		    if (this._gameMode === 4 /* TIME_ATTACK */ && this._runningSince !== null && (this._elapsedMs + (this._clock.now() - this._runningSince)) / 1e3 >= this._config.gameRules.timeAttackDuration) {
		      this._gameOverCallback("game over!", this._getCurrentSettlement());
		    }
		  }
		  /** Move the current piece left one cell. */
		  doMoveLeft() {
		    if (!this._checkCanMoveLeft()) return false;
		    this._lockDownMoveCounter += 1;
		    this._lockDownTimer = 0;
		    this._lastMove = 0 /* MOVE */;
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
		      const [x, y] = this.curTetrimino.bodies[i];
		      this.curTetrimino.bodies[i] = [x, y - 1];
		    }
		    return true;
		  }
		  /** Move the current piece right one cell. */
		  doMoveRight() {
		    if (!this._checkCanMoveRight()) return false;
		    this._lockDownMoveCounter += 1;
		    this._lockDownTimer = 0;
		    this._lastMove = 0 /* MOVE */;
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    for (let i = 0; i < this.curTetrimino.bodies.length; i++) {
		      const [x, y] = this.curTetrimino.bodies[i];
		      this.curTetrimino.bodies[i] = [x, y + 1];
		    }
		    return true;
		  }
		  /** Rotate the current piece clockwise (SRS). */
		  doRotateCw() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    const cur = this.curTetrimino.direction;
		    const idx = DIRECTIONS.indexOf(cur);
		    const next = DIRECTIONS[(idx + 1) % DIRECTIONS.length];
		    this._rotate(cur, next);
		  }
		  /** Rotate the current piece counter-clockwise (SRS). */
		  doRotateCcw() {
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    const cur = this.curTetrimino.direction;
		    const idx = DIRECTIONS.indexOf(cur);
		    const next = DIRECTIONS[(DIRECTIONS.length + (idx - 1)) % DIRECTIONS.length];
		    this._rotate(cur, next);
		  }
		  /** Perform one soft-drop step, awarding 1 x level per cell dropped. */
		  doSoftDrop() {
		    this._normalFallTimer = 0;
		    if (this._moveDown()) {
		      this.score += this.level;
		      this._lastMove = 0 /* MOVE */;
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
		  doHardDrop() {
		    while (this._moveDown()) {
		      this.score += this.level * 2;
		    }
		    this._lockDown();
		  }
		  /** Swap the current piece with the hold piece (once per lock-down cycle). */
		  doHold() {
		    if (this.holdOnce) return;
		    if (this.curTetrimino === null) throw new Error("curTetrimino is null");
		    this.holdOnce = true;
		    for (const [x, y] of this.curTetrimino) {
		      this.board[x][y] = 0 /* EMPTY */;
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
		  addGarbageLines(count) {
		    this._setNotice(`Garbage +${count}!`);
		    this.garbageQueue += count;
		  }
		  /** Current action notice, or `""` when none is active. */
		  getNotice() {
		    if (this.paused) return "PAUSED";
		    if (this._clock.now() - this._noticeTimerMs >= NOTICE_TTL_MS) return "";
		    return this._notice;
		  }
		  /** Export the board as a 2D array of shape values. */
		  serializeBoard() {
		    return this.board.map((row) => row.map((v) => v));
		  }
		  /** Immediately end the game. */
		  forcedGameOver(setTitle) {
		    this._gameOverCallback(setTitle, this._getCurrentSettlement());
		  }
		  /** Toggle the pause state (ignored in versus mode). */
		  togglePause() {
		    if (this._gameMode === 5 /* VERSUS */) return;
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
		  controllable() {
		    return !(this.paused || this._animating);
		  }
		};
		function formatClock(secondsTotal) {
		  const minutes = Math.trunc(secondsTotal / 60);
		  const seconds = Math.trunc(secondsTotal % 60);
		  const milliseconds = Math.trunc(secondsTotal * 100 % 100);
		  const pad = (n) => String(n).padStart(2, "0");
		  return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds)}`;
		}

		// src/client/game.ts
		var FIXED_DT = 1 / 30;
		var MAX_FRAME_TIME = 0.25;
		var KEY_MAP = {
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
		  P: "pause"
		};
		var BOUND_KEYS = new Set(Object.keys(KEY_MAP));
		function actionForKey(key) {
		  return KEY_MAP[key];
		}
		var TetrisGame = class {
		  core;
		  gameMode;
		  /** Mode the menu should preselect, and the mode a fresh wait resumes. */
		  lastMode;
		  /** Whether a game has been explicitly started (via the menu, a reset, or a
		   * wait). Used to decide between showing the menu and resuming play. */
		  _started = false;
		  outcome = null;
		  /** Bumped whenever anything observable changed, for cheap React syncs. */
		  revision = 0;
		  frame = null;
		  lastTime = 0;
		  accumulator = 0;
		  listeners = /* @__PURE__ */ new Set();
		  constructor(gameMode = 2 /* ENDLESS */) {
		    this.gameMode = gameMode;
		    this.lastMode = gameMode;
		    this.core = this.createCore(gameMode);
		  }
		  get started() {
		    return this._started;
		  }
		  /**
		   * Start `mode` as a new game and remember it as the default.
		   *
		   * This is what the menu confirms with, and what a waiting period uses when
		   * nothing has been started yet.
		   */
		  startMode(mode) {
		    this.lastMode = mode;
		    this.reset(mode);
		    this._started = true;
		  }
		  createCore(gameMode) {
		    return new TetrisCore({
		      gameMode,
		      gameOverCallback: (title, settlement) => {
		        this.outcome = { title, settlement };
		        this.stop();
		        this.notify();
		      },
		      lockDownCallback: () => {
		      }
		    });
		  }
		  get modeLabel() {
		    return gameModeLabel(this.gameMode);
		  }
		  subscribe(listener) {
		    this.listeners.add(listener);
		    return () => this.listeners.delete(listener);
		  }
		  notify() {
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
		  reset(gameMode = this.gameMode) {
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
		  get isRunning() {
		    return this.frame !== null;
		  }
		  /** Start the fixed-timestep loop. Idempotent. */
		  start() {
		    if (this.frame !== null) return;
		    if (this.outcome !== null) return;
		    this.lastTime = performance.now() / 1e3;
		    this.accumulator = 0;
		    this.frame = requestAnimationFrame(this.tick);
		  }
		  /** Stop the loop, preserving all game state. Idempotent. */
		  stop() {
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
		  setPaused(paused) {
		    if (this.core.paused === paused) return;
		    this.core.togglePause();
		    this.notify();
		  }
		  get paused() {
		    return this.core.paused || this.outcome !== null;
		  }
		  /**
		   * Apply one control action to the engine.
		   *
		   * There is deliberately no "quit" action: the Web panel owns restarting and
		   * closing with real buttons, so an engine-ending hotkey would only be a way
		   * to lose a game by accident.
		   */
		  dispatch(action) {
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
		  nextShapes(count = 5) {
		    const bag = this.core.bag.toArray();
		    const out = [];
		    for (let i = 0; i < count && i < bag.length; i++) out.push(bag[i].shape);
		    return out;
		  }
		  tick = () => {
		    this.frame = requestAnimationFrame(this.tick);
		    const now = performance.now() / 1e3;
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
		};

		// src/client/styles.ts
		var CSS = `
		.dsht_root {
		  position: absolute;
		  inset: 0;
		  z-index: 30;
		  /* The overlay layer is click-through; only the panel/chip opt back in. */
		  pointer-events: none;
		  font-family: var(--dsw-font-sans, ui-sans-serif, system-ui, sans-serif);
		  font-size: 12px;
		  line-height: 1.4;
		  color: var(--dsw-alias-label-primary, #e8e8ea);
		  user-select: none;
		}
		/* Default seat: bottom-right, lifted clear of the composer. Dragging pins
		   explicit left/top and clears the default anchors. */
		.dsht_panel {
		  position: absolute;
		  right: 20px;
		  bottom: 104px;
		  pointer-events: auto;
		  /* Board 220 + gaps 20 + two 120px columns + padding 20. */
		  width: 500px;
		  border-radius: 12px;
		  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.14));
		  background: var(--dsw-specific-menu, rgba(28,28,32,0.96));
		  box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(0,0,0,0.45));
		  backdrop-filter: blur(12px);
		  overflow: hidden;
		  /* Recessed-well tokens. DSH's fill/border aliases are translucent and are
		     re-pointed per theme, so the Hold/Next slots follow the active theme
		     without hardcoding a colour. */
		  --dsht-slot-bg: var(--dsw-alias-fill-l2, rgba(255,255,255,0.07));
		  --dsht-slot-border: var(--dsw-alias-border-l1, rgba(255,255,255,0.12));
		}
		.dsht_header {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  padding: 8px 10px;
		  cursor: grab;
		  border-bottom: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12));
		}
		.dsht_header:active { cursor: grabbing; }
		.dsht_title { font-weight: 600; letter-spacing: 0.02em; }
		.dsht_mode {
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		  font-size: 11px;
		  padding: 1px 6px;
		  border-radius: 999px;
		  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.08));
		}
		.dsht_spacer { flex: 1; }
		.dsht_btn {
		  appearance: none;
		  border: 0;
		  background: transparent;
		  color: var(--dsw-alias-label-secondary, #b8b8c0);
		  cursor: pointer;
		  border-radius: 6px;
		  min-width: 22px;
		  height: 22px;
		  padding: 0 5px;
		  font-size: 12px;
		  line-height: 1;
		}
		.dsht_btn:hover {
		  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.1));
		  color: var(--dsw-alias-label-primary, #fff);
		}
		.dsht_body { display: flex; align-items: flex-start; gap: 10px; padding: 10px; }
		.dsht_leftCol {
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  gap: 6px;
		  width: 120px;
		}
		.dsht_rightCol {
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  gap: 6px;
		  width: 120px;
		}
		/* The Hold/Next wells, mirroring the board's recessed treatment. Sizes come
		   from the renderer's constants (applied inline) so CSS cannot drift from the
		   canvas geometry. */
		.dsht_slot {
		  box-sizing: border-box;
		  display: flex;
		  align-items: center;
		  justify-content: center;
		  padding: 3px;
		  border-radius: 8px;
		  background: var(--dsht-slot-bg);
		  border: 0.5px solid var(--dsht-slot-border);
		}
		/* The Next column: five equally-sized wells with a real gap between them, so
		   consecutive previews never read as one clump. */
		.dsht_nextList {
		  align-items: center;
		  display: flex;
		  flex-direction: column;
		  gap: 4px;
		}
		.dsht_slotLabel {
		  font-size: 10px;
		  text-transform: uppercase;
		  letter-spacing: 0.08em;
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		}
		.dsht_center {
		  position: relative;
		  border-radius: 8px;
		  transition: box-shadow 0.12s ease;
		}
		/* Focus is signalled by a ring around the playfield. It used to be an overlay
		   inside the board, which covered exactly the rows you need to watch. */
		.dsht_centerFocused {
		  box-shadow: 0 0 0 2px var(--dsw-alias-state-success-primary, #46d07f);
		}
		.dsht_canvas { display: block; border-radius: 8px; }
		.dsht_stats {
		  box-sizing: border-box;
		  display: grid;
		  grid-template-columns: 1fr 1fr;
		  gap: 2px 8px;
		  padding: 0 10px 8px;
		  /* Fixed so the menu can match the game page's height exactly. */
		  height: 46px;
		}
		.dsht_stat { display: flex; justify-content: space-between; gap: 6px; }
		.dsht_statKey { color: var(--dsw-alias-label-tertiary, #9a9aa2); }
		.dsht_statVal { font-variant-numeric: tabular-nums; font-weight: 600; }
		.dsht_footer {
		  box-sizing: border-box;
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  height: 34px;
		  padding: 0 10px 8px;
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		  font-size: 11px;
		}
		/* \u2500\u2500 lock-down notice popup \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
		   Each tier reads differently: size, weight and colour all vary, so a Tetris
		   or a T-Spin lands visually while a single stays quiet. */
		.dsht_noticeBox {
		  width: 100%;
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  gap: 6px;
		}
		.dsht_notice {
		  width: 100%;
		  box-sizing: border-box;
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  gap: 3px;
		  padding: 7px 8px;
		  border-radius: 10px;
		  border: 0.5px solid var(--dsht-slot-border);
		  background: var(--dsht-slot-bg);
		  text-align: center;
		  line-height: 1.15;
		  animation: dsht_pop 170ms cubic-bezier(0.2, 1.4, 0.4, 1);
		}
		.dsht_noticeLabel { display: block; }
		.dsht_noticeSingle { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-secondary, #b8b8c0); }
		.dsht_noticeDouble { font-size: 13px; font-weight: 600; color: #4b9bff; }
		.dsht_noticeTriple { font-size: 15px; font-weight: 700; color: var(--dsw-alias-state-warning-primary, #f5a623); }
		.dsht_noticeTetris { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; color: var(--dsw-alias-state-success-primary, #46d07f); }
		.dsht_noticeTspin { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; color: #a86bff; }
		.dsht_noticeMini { font-size: 13px; font-weight: 700; color: #a86bff; }
		.dsht_noticeGarbage { font-size: 13px; font-weight: 700; color: var(--dsw-alias-state-error-primary, #ff6b6b); }
		.dsht_noticeB2b {
		  font-size: 10px;
		  font-weight: 700;
		  letter-spacing: 0.08em;
		  padding: 1px 6px;
		  border-radius: 4px;
		  background: color-mix(in srgb, currentColor 22%, transparent);
		  color: inherit;
		}
		/* \u2500\u2500 conversation-binding slider \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
		.dsht_switch {
		  display: inline-flex;
		  align-items: center;
		  gap: 6px;
		  padding: 2px 6px 2px 4px;
		  border-radius: 7px;
		  cursor: pointer;
		  user-select: none;
		  font-size: 11px;
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		}
		.dsht_switch:hover { background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.08)); }
		/* The checkbox itself is the interactive control and the test hook, but it is
		   visually replaced by the track + thumb below. */
		.dsht_switchInput {
		  position: absolute;
		  width: 1px;
		  height: 1px;
		  opacity: 0;
		  pointer-events: none;
		}
		.dsht_switchTrack {
		  position: relative;
		  flex: none;
		  width: 26px;
		  height: 15px;
		  border-radius: 999px;
		  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.18));
		  transition: background 0.14s ease;
		}
		.dsht_switchThumb {
		  position: absolute;
		  top: 2px;
		  left: 2px;
		  width: 11px;
		  height: 11px;
		  border-radius: 50%;
		  background: #ffffff;
		  transition: transform 0.14s cubic-bezier(0.3, 1.4, 0.5, 1);
		}
		/* Constant feature caption (state lives in the track/thumb only). */
		.dsht_switchText {
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		  transition: color 0.14s ease;
		}
		.dsht_switchOn .dsht_switchText {
		  color: var(--dsw-alias-label-secondary, #b8b8c0);
		}
		.dsht_switchOn .dsht_switchTrack {
		  background: var(--dsw-alias-state-success-primary, #46d07f);
		}
		.dsht_switchOn .dsht_switchThumb { transform: translateX(11px); }
		.dsht_switchInput:focus-visible + .dsht_switchTrack {
		  box-shadow: 0 0 0 2px var(--dsw-alias-state-success-primary, #46d07f);
		}

		/* \u2500\u2500 mode menu (upstream's ui/menu.py screen) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
		.dsht_menu {
		  box-sizing: border-box;
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  gap: 10px;
		  padding: 16px 18px 14px;
		  outline: none;
		  /* Exactly as tall as the game page: playfield + body padding + the fixed
		     stats/footer/keys strip. Switching pages must not resize the panel. */
		  height: calc(var(--dsht-board-h, 440px) + 20px + var(--dsht-chrome-h, 114px));
		}
		/* The block title is a fixed glyph grid: it only lines up if EVERY character
		   (box-drawing included) advances by exactly one cell. The theme's mono family
		   resolves to a CJK face here, and CJK fonts commonly draw U+2500..257F at
		   full width, which shifts each row by a cell. Pin a Latin monospace that
		   covers box-drawing at half width instead. */
		.dsht_menuTitle {
		  margin: 0;
		  font-family: "DejaVu Sans Mono", "Liberation Mono", "Noto Sans Mono",
		    ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		  font-size: 13px;
		  line-height: 1.2;
		  letter-spacing: 0;
		  font-variant-ligatures: none;
		  font-feature-settings: normal;
		  color: var(--dsw-alias-label-primary, #e8e8ea);
		  text-align: left;
		  white-space: pre;
		}
		.dsht_menuList {
		  box-sizing: border-box;
		  flex: 1;
		  min-height: 0;
		  display: flex;
		  flex-direction: column;
		  /* The rows spread over the full height, which is also what makes the menu
		     read like the terminal list rather than a tight stack. */
		  justify-content: space-evenly;
		  gap: 2px;
		  width: 100%;
		}
		.dsht_menuItem {
		  appearance: none;
		  border: 0.5px solid transparent;
		  background: transparent;
		  border-radius: 8px;
		  padding: 9px 10px;
		  cursor: pointer;
		  font-size: 13px;
		  font-weight: 600;
		  letter-spacing: 0.1em;
		  color: var(--dsw-alias-label-secondary, #b8b8c0);
		  text-align: center;
		}
		.dsht_menuItem:hover {
		  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.07));
		}
		.dsht_menuItemActive {
		  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.12));
		  border-color: var(--dsht-slot-border);
		  color: var(--dsw-alias-label-primary, #fff);
		}
		.dsht_menuItemDisabled { opacity: 0.45; cursor: not-allowed; }
		.dsht_menuDesc {
		  min-height: 18px;
		  font-size: 11px;
		  color: var(--dsw-alias-label-tertiary, #9a9aa2);
		  text-align: center;
		}
		.dsht_menuHint {
		  font-size: 10px;
		  color: var(--dsw-alias-label-tertiary, #8f8f97);
		  text-align: center;
		}
		@keyframes dsht_pop {
		  from { transform: scale(0.86); opacity: 0; }
		  to { transform: scale(1); opacity: 1; }
		}
		.dsht_keys {
		  box-sizing: border-box;
		  height: 34px;
		  overflow: hidden;
		  font-size: 10px;
		  line-height: 1.35;
		  color: var(--dsw-alias-label-tertiary, #8f8f97);
		  padding: 0 10px 6px;
		}
		.dsht_keysRow { white-space: nowrap; }
		.dsht_kbd {
		  display: inline-block;
		  padding: 0 4px;
		  border-radius: 4px;
		  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.16));
		  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.06));
		  font-family: var(--dsw-font-mono, ui-monospace, monospace);
		  font-size: 10px;
		}
		.dsht_overlay {
		  position: absolute;
		  inset: 0;
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		  justify-content: center;
		  gap: 6px;
		  border-radius: 8px;
		  background: rgba(12,12,14,0.86);
		  backdrop-filter: blur(3px);
		  text-align: center;
		  padding: 12px;
		}
		.dsht_overlayTitle { font-size: 15px; font-weight: 700; }
		.dsht_overlayScore { font-variant-numeric: tabular-nums; font-size: 13px; }
		.dsht_overlayHint { color: var(--dsw-alias-label-tertiary, #9a9aa2); font-size: 11px; }
		.dsht_primary {
		  appearance: none;
		  border: 0;
		  border-radius: 7px;
		  padding: 6px 12px;
		  cursor: pointer;
		  font-size: 12px;
		  font-weight: 600;
		  color: #0b0b0d;
		  background: var(--dsw-alias-state-success-primary, #46d07f);
		}
		.dsht_focusHintInline {
		  color: var(--dsw-alias-state-warning-primary, #f5a623);
		}
		.dsht_chip {
		  position: absolute;
		  right: 20px;
		  bottom: 20px;
		  pointer-events: auto;
		  width: 44px;
		  height: 44px;
		  padding: 0;
		  display: flex;
		  align-items: center;
		  justify-content: center;
		  border-radius: 50%;
		  border: 0.5px solid var(--dsht-slot-border);
		  background: var(--dsw-specific-menu, rgba(28,28,32,0.94));
		  box-shadow: var(--dsw-elevation-prominent, 0 6px 18px rgba(0,0,0,0.4));
		  cursor: grab;
		  /* The chip is dragged with pointer events, so the browser must not claim
		     the gesture for scrolling. */
		  touch-action: none;
		  transition: transform 0.12s ease, background 0.12s ease;
		}
		.dsht_chip:hover {
		  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.12));
		  transform: scale(1.06);
		}
		.dsht_chip:active { cursor: grabbing; }
		.dsht_chipPinned { right: auto; bottom: auto; }
		.dsht_chip svg { display: block; pointer-events: none; }
		50% { opacity: 0.25 } }
		`;
		var TAG_ID = "dsh-plugin-tetris/styles.css";
		function installStyles() {
		  if (typeof document === "undefined") return;
		  if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return;
		  const tag = document.createElement("style");
		  tag.dataset.plugin = "dsh-plugin-tetris";
		  tag.dataset.pluginCss = TAG_ID;
		  tag.textContent = CSS;
		  document.head.appendChild(tag);
		}

		// src/client/view.tsx
		var React = __toESM(require("react"), 1);

		// src/client/menu.ts
		var MENU_SECTIONS = [
		  {
		    key: "150-lines",
		    label: "150 LINES",
		    description: "\u6D88\u6EE1 150 \u884C\u5373\u7ED3\u675F",
		    mode: 0 /* LINES_150 */
		  },
		  {
		    key: "casual",
		    label: "CASUAL",
		    description: "\u8F7B\u677E\u6A21\u5F0F\uFF0C\u7B49\u7EA7\u4E0A\u9650 5",
		    mode: 1 /* CASUAL */
		  },
		  {
		    key: "endless",
		    label: "ENDLESS",
		    description: "\u65E0\u5C3D\u6A21\u5F0F\uFF0C\u7B49\u7EA7\u4E0A\u9650 15",
		    mode: 2 /* ENDLESS */
		  },
		  {
		    key: "digging",
		    label: "DIGGING",
		    description: "\u4E0D\u65AD\u6D8C\u5165\u5783\u573E\u884C\uFF0C\u7B49\u7EA7\u4E0A\u9650 5",
		    mode: 3 /* DIGGING */
		  },
		  {
		    key: "time-attack",
		    label: "TIME ATTACK",
		    description: "2 \u5206\u949F\u5185\u5C3D\u53EF\u80FD\u591A\u6D88\u884C",
		    mode: 4 /* TIME_ATTACK */
		  },
		  {
		    key: "versus",
		    label: "VERSUS",
		    description: "\u9700\u8981\u8054\u673A\u670D\u52A1\u5668\uFF0C\u672C\u63D2\u4EF6\u672A\u5B9E\u73B0",
		    disabled: true
		  },
		  {
		    key: "quit",
		    label: "QUIT",
		    description: "\u6536\u8D77\u9762\u677F\uFF0C\u56DE\u5230\u53F3\u4E0B\u89D2\u80F6\u56CA"
		  }
		];
		var MENU_TITLE_ART = [
		  "\u2501\u250F\u251B  \u250F\u2501\u251B  \u2501\u250F\u251B  \u250F\u2501\u2503  \u2501\u250F\u251B  \u250F\u2501\u251B",
		  " \u2503   \u250F\u2501\u251B   \u2503   \u250F\u250F\u251B   \u2503   \u2501\u2501\u2503",
		  " \u251B   \u2501\u2501\u251B   \u251B   \u251B \u251B  \u2501\u2501\u251B  \u2501\u2501\u251B"
		];
		function menuActionForKey(key) {
		  switch (key) {
		    // Upstream: KEY_UP moves up; KEY_DOWN and TAB move down; "\n" confirms.
		    case "ArrowUp":
		      return "up";
		    case "ArrowDown":
		    case "Tab":
		      return "down";
		    case "Enter":
		      return "confirm";
		    default:
		      return void 0;
		  }
		}
		function stepSelection(index, action, sections = MENU_SECTIONS) {
		  const count = sections.length;
		  if (count === 0) return 0;
		  const next = action === "up" ? index - 1 : index + 1;
		  return (next % count + count) % count;
		}
		function indexOfMode(mode, sections = MENU_SECTIONS) {
		  return sections.findIndex((section) => section.mode === mode);
		}
		var MENU_HINT = "\u2191 \u2193 \u9009\u62E9 \xB7 Tab \u4E0B\u4E00\u4E2A \xB7 Enter \u5F00\u59CB";

		// src/client/notice.ts
		var B2B_SUFFIX = "B2B!";
		var PAUSED_NOTICE = "PAUSED";
		function classifyNotice(notice) {
		  const trimmed = notice.trim();
		  const b2b = trimmed.endsWith(B2B_SUFFIX);
		  const label = b2b ? trimmed.slice(0, -B2B_SUFFIX.length).trim() : trimmed;
		  let tier;
		  if (label.startsWith("T-Spin Mini")) tier = "mini";
		  else if (label.startsWith("T-Spin")) tier = "tspin";
		  else if (label.startsWith("Tetris")) tier = "tetris";
		  else if (label.startsWith("Triple")) tier = "triple";
		  else if (label.startsWith("Double")) tier = "double";
		  else if (label.startsWith("Garbage")) tier = "garbage";
		  else tier = "single";
		  return { tier, label, b2b };
		}
		function tierClass(tier) {
		  return tier.charAt(0).toUpperCase() + tier.slice(1);
		}
		function isDisplayableNotice(notice) {
		  return notice !== "" && notice !== PAUSED_NOTICE;
		}

		// src/client/render.ts
		var CELL = 22;
		var BUFFER_ROWS2 = 20;
		var SHAPE_COLOR = {
		  [1 /* Z */]: "#e5484d",
		  // red
		  [2 /* S */]: "#30a46c",
		  // green
		  [3 /* O */]: "#f5d90a",
		  // yellow
		  [4 /* J */]: "#3e63dd",
		  // blue
		  [5 /* T */]: "#8e4ec6",
		  // purple
		  [6 /* I */]: "#00d5ff",
		  // cyan
		  [7 /* L */]: "#f76b15",
		  // orange
		  [8 /* GARBAGE */]: "#5b6472",
		  // grey
		  [9 /* CLEAR */]: "#ffffff"
		};
		var EMPTY_CELL = "rgba(255,255,255,0.045)";
		var GRID_LINE = "rgba(255,255,255,0.07)";
		function prepare(canvas, cssWidth, cssHeight) {
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
		function paintCell(ctx, x, y, size, color, alpha = 1) {
		  ctx.globalAlpha = alpha;
		  ctx.fillStyle = color;
		  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
		  ctx.globalAlpha = alpha * 0.28;
		  ctx.fillStyle = "#ffffff";
		  ctx.fillRect(x + 1, y + 1, size - 2, Math.max(2, size * 0.16));
		  ctx.globalAlpha = 1;
		}
		function paintGhost(ctx, x, y, size, color) {
		  ctx.globalAlpha = 0.22;
		  ctx.fillStyle = color;
		  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
		  ctx.globalAlpha = 0.55;
		  ctx.strokeStyle = color;
		  ctx.lineWidth = 1;
		  ctx.strokeRect(x + 2.5, y + 2.5, size - 5, size - 5);
		  ctx.globalAlpha = 1;
		}
		function boardSize(core) {
		  return {
		    width: core.gameRules.boardWidth * CELL,
		    height: (core.gameRules.boardHeight - BUFFER_ROWS2) * CELL
		  };
		}
		function drawBoard(canvas, core) {
		  const visibleRows = core.gameRules.boardHeight - BUFFER_ROWS2;
		  const cols = core.gameRules.boardWidth;
		  const width = cols * CELL;
		  const height = visibleRows * CELL;
		  const ctx = prepare(canvas, width, height);
		  if (ctx === null) return;
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
		  const clearingRows = /* @__PURE__ */ new Set();
		  for (let row = BUFFER_ROWS2; row < core.gameRules.boardHeight; row++) {
		    if (core.board[row].some((v) => v === 9 /* CLEAR */)) {
		      clearingRows.add(row);
		    }
		  }
		  const flashBright = Math.floor(core.gameTime / core.timing.clearAnimFlashInterval) % 2 === 1;
		  const flashColor = "#ffffff";
		  const flashAlpha = flashBright ? 0.95 : 0.22;
		  const clearingPaint = (row, col) => {
		    paintCell(ctx, col * CELL, (row - BUFFER_ROWS2) * CELL, CELL, flashColor, flashAlpha);
		  };
		  for (let row = BUFFER_ROWS2; row < core.gameRules.boardHeight; row++) {
		    const y = (row - BUFFER_ROWS2) * CELL;
		    for (let col = 0; col < cols; col++) {
		      const cell = core.board[row][col];
		      const x = col * CELL;
		      if (cell === 0 /* EMPTY */) {
		        ctx.fillStyle = EMPTY_CELL;
		        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
		      } else if (cell === 9 /* CLEAR */) {
		        clearingPaint(row, col);
		      } else {
		        paintCell(ctx, x, y, CELL, SHAPE_COLOR[cell] ?? "#888888");
		      }
		    }
		  }
		  const piece = core.curTetrimino;
		  if (piece === null) return;
		  const pieceColor = SHAPE_COLOR[piece.shape] ?? "#888888";
		  const pieceCells = new Set(piece.bodies.map(([r, c]) => `${r},${c}`));
		  for (const [row, col] of core.shadow) {
		    if (row < BUFFER_ROWS2) continue;
		    if (pieceCells.has(`${row},${col}`)) continue;
		    if (clearingRows.has(row)) clearingPaint(row, col);
		    else paintGhost(ctx, col * CELL, (row - BUFFER_ROWS2) * CELL, CELL, pieceColor);
		  }
		  for (const [row, col] of piece.bodies) {
		    if (row < BUFFER_ROWS2) continue;
		    if (clearingRows.has(row)) clearingPaint(row, col);
		    else paintCell(ctx, col * CELL, (row - BUFFER_ROWS2) * CELL, CELL, pieceColor);
		  }
		}
		var PREVIEW_CELL = 18;
		var PREVIEW_SIZE = 73;
		var SLOT_SIZE = PREVIEW_SIZE + 7;
		function drawPreview(canvas, shape, alpha = 1) {
		  const ctx = prepare(canvas, PREVIEW_SIZE, PREVIEW_SIZE);
		  if (ctx === null || shape === null) return;
		  const cells = SHAPE_TABLE[shape];
		  if (cells.length === 0) return;
		  const [dx, dy] = SHOW_OFFSET[shape];
		  const shifted = cells.map(([r, c]) => [r + dx, c + dy]);
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
		      alpha
		    );
		  }
		}

		// src/client/view.tsx
		var import_jsx_runtime = require("react/jsx-runtime");
		var NEXT_COUNT = 5;
		var SLOT_STYLE = {
		  width: SLOT_SIZE,
		  height: SLOT_SIZE
		};
		function Stat({ label, value }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_stat", children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_statKey", children: label }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_statVal", children: value })
		  ] });
		}
		function TetrisPanel({
		  game,
		  screen,
		  onMenu,
		  onChooseMode,
		  onResume,
		  focusRequest,
		  openAt,
		  focusBinding,
		  onToggleFocusBinding,
		  onClose
		}) {
		  const [, forceRender] = React.useReducer((n) => n + 1, 0);
		  const boardRef = React.useRef(null);
		  const holdRef = React.useRef(null);
		  const nextRefs = React.useRef([]);
		  const panelRef = React.useRef(null);
		  const [focused, setFocused] = React.useState(false);
		  const [pinned, setPinned] = React.useState(
		    null
		  );
		  const clampToViewport = React.useCallback(
		    (left, top, width, height) => ({
		      left: Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - 8)),
		      top: Math.min(Math.max(8, top), Math.max(8, window.innerHeight - height - 8))
		    }),
		    []
		  );
		  React.useLayoutEffect(() => {
		    if (openAt === null) return;
		    const panel = panelRef.current;
		    if (panel === null) return;
		    setPinned(
		      clampToViewport(openAt.left, openAt.top, panel.offsetWidth, panel.offsetHeight)
		    );
		  }, [openAt, clampToViewport]);
		  React.useEffect(() => {
		    const onResize = () => {
		      const panel = panelRef.current;
		      if (panel === null) return;
		      setPinned(
		        (current) => current === null ? current : clampToViewport(current.left, current.top, panel.offsetWidth, panel.offsetHeight)
		      );
		    };
		    window.addEventListener("resize", onResize);
		    return () => window.removeEventListener("resize", onResize);
		  }, [clampToViewport]);
		  const drag = React.useRef(null);
		  React.useEffect(() => installStyles(), []);
		  const pausedByBlur = React.useRef(false);
		  React.useEffect(() => {
		    if (focusRequest === 0) return;
		    if (screen !== "game") return;
		    panelRef.current?.focus();
		    if (pausedByBlur.current) {
		      pausedByBlur.current = false;
		      game.setPaused(false);
		    }
		  }, [screen, focusRequest, game]);
		  React.useEffect(() => game.subscribe(() => forceRender()), [game]);
		  React.useEffect(() => {
		    if (screen !== "game") return void 0;
		    game.start();
		    return () => game.stop();
		  }, [game, screen]);
		  React.useEffect(() => {
		    if (boardRef.current !== null) drawBoard(boardRef.current, game.core);
		    if (holdRef.current !== null) {
		      drawPreview(
		        holdRef.current,
		        game.core.hold?.shape ?? null,
		        game.core.holdOnce ? 0.35 : 1
		      );
		    }
		    const upcoming = game.nextShapes(NEXT_COUNT);
		    nextRefs.current.forEach((canvas, index) => {
		      if (canvas !== null) drawPreview(canvas, upcoming[index] ?? null);
		    });
		  });
		  const onKeyDown = (event) => {
		    const action = actionForKey(event.key);
		    if (action === void 0) return;
		    event.preventDefault();
		    event.stopPropagation();
		    game.dispatch(action);
		  };
		  const onHeaderPointerDown = (event) => {
		    if (event.target.closest("button, label, input, a") !== null) {
		      return;
		    }
		    const panel = panelRef.current;
		    if (panel === null) return;
		    const rect = panel.getBoundingClientRect();
		    drag.current = {
		      pointerId: event.pointerId,
		      offsetX: event.clientX - rect.left,
		      offsetY: event.clientY - rect.top
		    };
		    event.currentTarget.setPointerCapture(event.pointerId);
		  };
		  const onHeaderPointerMove = (event) => {
		    const state = drag.current;
		    if (state === null || state.pointerId !== event.pointerId) return;
		    const panel = panelRef.current;
		    setPinned(
		      clampToViewport(
		        event.clientX - state.offsetX,
		        event.clientY - state.offsetY,
		        panel?.offsetWidth ?? 500,
		        panel?.offsetHeight ?? 620
		      )
		    );
		  };
		  const onHeaderPointerUp = (event) => {
		    const state = drag.current;
		    if (state === null || state.pointerId !== event.pointerId) return;
		    drag.current = null;
		    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		      event.currentTarget.releasePointerCapture(event.pointerId);
		    }
		  };
		  const core = game.core;
		  const size = boardSize(core);
		  const outcome = game.outcome;
		  const rawNotice = core.getNotice();
		  const notice = isDisplayableNotice(rawNotice) ? classifyNotice(rawNotice) : null;
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		    "div",
		    {
		      ref: panelRef,
		      className: "dsht_panel",
		      tabIndex: 0,
		      onKeyDown: screen === "game" ? onKeyDown : void 0,
		      onFocus: () => setFocused(true),
		      onBlur: (event) => {
		        setFocused(false);
		        if (!focusBinding) return;
		        const next = event.relatedTarget;
		        if (next !== null && panelRef.current?.contains(next) === true) return;
		        if (game.outcome !== null || game.core.paused) return;
		        pausedByBlur.current = true;
		        game.setPaused(true);
		      },
		      style: {
		        outline: "none",
		        // The menu sizes itself from the playfield so both pages are the
		        // same height; the board is the only variable part of the layout.
		        "--dsht-board-h": `${size.height}px`,
		        ...pinned === null ? {} : { left: pinned.left, top: pinned.top, right: "auto", bottom: "auto" }
		      },
		      children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		          "div",
		          {
		            className: "dsht_header",
		            onPointerDown: onHeaderPointerDown,
		            onPointerMove: onHeaderPointerMove,
		            onPointerUp: onHeaderPointerUp,
		            onPointerCancel: onHeaderPointerUp,
		            children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_title", children: "\u4FC4\u7F57\u65AF\u65B9\u5757" }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_mode", children: game.modeLabel }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_spacer" }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		                "label",
		                {
		                  className: `dsht_switch${focusBinding ? " dsht_switchOn" : ""}`,
		                  title: focusBinding ? "\u7126\u70B9\u8054\u52A8\u5DF2\u5F00\u542F\uFF1A\u5931\u53BB\u7126\u70B9\u81EA\u52A8\u6682\u505C\uFF1B\u5BF9\u8BDD\u7ED3\u675F\u540E\u81EA\u52A8\u628A\u7126\u70B9\u4EA4\u8FD8\u6E38\u620F" : "\u7126\u70B9\u8054\u52A8\u5DF2\u5173\u95ED\uFF1A\u6E38\u620F\u4E0D\u4F1A\u56E0\u5931\u7126\u6682\u505C\uFF0C\u4E5F\u4E0D\u4F1A\u5728\u5BF9\u8BDD\u7ED3\u675F\u540E\u62A2\u7126\u70B9",
		                  children: [
		                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                      "input",
		                      {
		                        type: "checkbox",
		                        className: "dsht_switchInput",
		                        checked: focusBinding,
		                        "data-dsht-action": "focus-binding",
		                        "data-dsht-focus-binding": focusBinding ? "1" : "0",
		                        "aria-label": focusBinding ? "\u7126\u70B9\u8054\u52A8\uFF1A\u5DF2\u5F00\u542F\uFF0C\u70B9\u51FB\u5173\u95ED" : "\u7126\u70B9\u8054\u52A8\uFF1A\u5DF2\u5173\u95ED\uFF0C\u70B9\u51FB\u5F00\u542F",
		                        onChange: onToggleFocusBinding
		                      }
		                    ),
		                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_switchTrack", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_switchThumb" }) }),
		                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_switchText", children: "\u7126\u70B9\u8054\u52A8" })
		                  ]
		                }
		              ),
		              screen === "game" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                "button",
		                {
		                  type: "button",
		                  className: "dsht_btn",
		                  "data-dsht-action": "menu",
		                  title: "\u56DE\u5230\u83DC\u5355",
		                  onClick: onMenu,
		                  children: "\u2630"
		                }
		              ) : null,
		              screen === "game" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                  "button",
		                  {
		                    type: "button",
		                    className: "dsht_btn",
		                    "data-dsht-action": "pause",
		                    title: core.paused ? "\u7EE7\u7EED (P)" : "\u6682\u505C (P)",
		                    onClick: () => game.dispatch("pause"),
		                    children: core.paused ? "\u25B6" : "\u275A\u275A"
		                  }
		                ),
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                  "button",
		                  {
		                    type: "button",
		                    className: "dsht_btn",
		                    "data-dsht-action": "restart",
		                    title: "\u91CD\u5F00\u4E00\u5C40",
		                    onClick: () => game.reset(),
		                    children: "\u21BB"
		                  }
		                )
		              ] }) : null,
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                "button",
		                {
		                  type: "button",
		                  className: "dsht_btn",
		                  "data-dsht-action": "close",
		                  title: "\u6536\u8D77\uFF08\u53F3\u4E0B\u89D2\u80F6\u56CA\u53EF\u518D\u6253\u5F00\uFF09",
		                  onClick: onClose,
		                  children: "\u2715"
		                }
		              )
		            ]
		          }
		        ),
		        screen === "menu" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		          TetrisMenu,
		          {
		            autoFocus: focusRequest > 0,
		            defaultMode: game.lastMode,
		            canResume: game.started && game.outcome === null,
		            resumeScore: game.core.score,
		            onResume,
		            onChoose: onChooseMode,
		            onQuit: onClose
		          }
		        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_body", children: [
		            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_leftCol", children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_slotLabel", children: "Hold" }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_slot", style: SLOT_STYLE, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: holdRef, className: "dsht_canvas" }) }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_noticeBox", children: notice === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		                "div",
		                {
		                  className: `dsht_notice dsht_notice${tierClass(notice.tier)}`,
		                  children: [
		                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_noticeLabel", children: notice.label }),
		                    notice.b2b ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_noticeB2b", children: "B2B" }) : null
		                  ]
		                }
		              ) })
		            ] }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `dsht_center${focused ? " dsht_centerFocused" : ""}`, children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                "canvas",
		                {
		                  ref: boardRef,
		                  className: "dsht_canvas dsht_board",
		                  style: { width: size.width, height: size.height }
		                }
		              ),
		              outcome !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_overlay", "data-dsht-overlay": "over", children: [
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_overlayTitle", children: "\u6E38\u620F\u7ED3\u675F" }),
		                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsht_overlayScore", children: [
		                  "\u5F97\u5206 ",
		                  outcome.settlement.score
		                ] }),
		                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsht_overlayHint", children: [
		                  "\u6D88\u884C ",
		                  outcome.settlement.lines,
		                  " \xB7 \u7528\u65F6 ",
		                  outcome.settlement.time
		                ] }),
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                  "button",
		                  {
		                    type: "button",
		                    className: "dsht_primary",
		                    "data-dsht-action": "play-again",
		                    onClick: () => game.reset(),
		                    children: "\u518D\u6765\u4E00\u5C40"
		                  }
		                )
		              ] }) : null,
		              outcome === null && core.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_overlay", "data-dsht-overlay": "paused", children: [
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_overlayTitle", children: "\u5DF2\u6682\u505C" }),
		                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_overlayHint", children: game.isRunning ? "\u6309 P \u7EE7\u7EED" : "\u7B49\u5F85 agent \u4E0B\u4E00\u6B65\u2026" })
		              ] }) : null
		            ] }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_rightCol", children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_slotLabel", children: "Next" }),
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_nextList", children: Array.from({ length: NEXT_COUNT }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_slot", style: SLOT_STYLE, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		                "canvas",
		                {
		                  className: "dsht_canvas",
		                  ref: (element) => {
		                    nextRefs.current[index] = element;
		                  }
		                }
		              ) }, index)) })
		            ] })
		          ] }),
		          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_stats", children: [
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, { label: "\u5206\u6570", value: String(core.score) }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, { label: "\u6D88\u884C", value: String(core.lines) }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, { label: "\u7B49\u7EA7", value: String(core.level) }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		              Stat,
		              {
		                label: game.gameMode === 4 /* TIME_ATTACK */ ? "\u5269\u4F59" : "\u65F6\u95F4",
		                value: game.gameMode === 4 /* TIME_ATTACK */ ? core.timeRemaining : core.gameTimeStr
		              }
		            )
		          ] }),
		          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_footer", children: outcome === null && !core.paused && !focused ? (
		            // The "click to start" affordance lives here rather than floating
		            // over the playfield, where it covered the bottom rows.
		            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_focusHintInline", children: "\u70B9\u51FB\u68CB\u76D8\u540E\u7528\u952E\u76D8\u64CD\u4F5C" })
		          ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u7B49\u5F85 agent \u65F6\u6765\u4E00\u5C40" }) }),
		          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_keys", children: [
		            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_keysRow", children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "\u2190" }),
		              " ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "\u2192" }),
		              " \u79FB\u52A8 \xB7",
		              " ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "\u2191" }),
		              "/",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "X" }),
		              " ",
		              "\u987A\u65F6\u9488 \xB7 ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "Z" }),
		              " \u9006\u65F6\u9488"
		            ] }),
		            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsht_keysRow", children: [
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "\u2193" }),
		              " \u8F6F\u964D \xB7",
		              " ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "\u7A7A\u683C" }),
		              " \u786C\u964D \xB7",
		              " ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "C" }),
		              " Hold \xB7",
		              " ",
		              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsht_kbd", children: "P" }),
		              " \u6682\u505C"
		            ] })
		          ] })
		        ] })
		      ]
		    }
		  );
		}
		function TetrisMenu({
		  autoFocus,
		  defaultMode,
		  canResume,
		  resumeScore,
		  onResume,
		  onChoose,
		  onQuit
		}) {
		  const initial = indexOfMode(defaultMode);
		  const [index, setIndex] = React.useState(initial >= 0 ? initial : 0);
		  const [hint, setHint] = React.useState("");
		  const menuRef = React.useRef(null);
		  React.useEffect(() => {
		    if (autoFocus) menuRef.current?.focus();
		  }, [autoFocus]);
		  const confirm = (section) => {
		    if (section.disabled === true) {
		      setHint(section.description);
		      return;
		    }
		    if (section.mode !== void 0) {
		      onChoose(section.mode);
		      return;
		    }
		    onQuit();
		  };
		  const onKeyDown = (event) => {
		    const action = menuActionForKey(event.key);
		    if (action === void 0) return;
		    event.preventDefault();
		    event.stopPropagation();
		    if (action === "confirm") {
		      confirm(MENU_SECTIONS[index]);
		      return;
		    }
		    setIndex((current) => stepSelection(current, action));
		    setHint("");
		  };
		  const selected = MENU_SECTIONS[index];
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		    "div",
		    {
		      ref: menuRef,
		      className: "dsht_menu",
		      tabIndex: 0,
		      onKeyDown,
		      style: { outline: "none" },
		      children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "dsht_menuTitle", children: MENU_TITLE_ART.join("\n") }),
		        canResume ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		          "button",
		          {
		            type: "button",
		            className: "dsht_resume",
		            "data-dsht-action": "resume",
		            onClick: onResume,
		            children: [
		              "\u7EE7\u7EED\u4E0A\u6B21\u5BF9\u5C40 \xB7 \u5F97\u5206 ",
		              resumeScore
		            ]
		          }
		        ) : null,
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_menuList", role: "listbox", "aria-label": "\u6E38\u620F\u6A21\u5F0F", children: MENU_SECTIONS.map((section, i) => {
		          const active = i === index;
		          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		            "button",
		            {
		              type: "button",
		              role: "option",
		              "aria-selected": active,
		              "data-dsht-mode": section.key,
		              className: [
		                "dsht_menuItem",
		                active ? "dsht_menuItemActive" : "",
		                section.disabled === true ? "dsht_menuItemDisabled" : ""
		              ].filter(Boolean).join(" "),
		              onMouseEnter: () => {
		                setIndex(i);
		                setHint("");
		              },
		              onClick: () => {
		                setIndex(i);
		                confirm(section);
		              },
		              children: section.label
		            },
		            section.key
		          );
		        }) }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_menuDesc", children: hint === "" ? selected.description : hint }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsht_menuHint", children: MENU_HINT })
		      ]
		    }
		  );
		}
		var CHIP_SIZE = 44;
		var CHIP_MARGIN = 4;
		function clampChipPosition(position) {
		  return {
		    left: Math.min(
		      Math.max(CHIP_MARGIN, position.left),
		      Math.max(CHIP_MARGIN, window.innerWidth - CHIP_SIZE - CHIP_MARGIN)
		    ),
		    top: Math.min(
		      Math.max(CHIP_MARGIN, position.top),
		      Math.max(CHIP_MARGIN, window.innerHeight - CHIP_SIZE - CHIP_MARGIN)
		    )
		  };
		}
		function TetrisChip({
		  position,
		  onMove,
		  onOpen,
		  buttonRef
		}) {
		  const drag = React.useRef(null);
		  const suppressClick = React.useRef(false);
		  const clamp = (left, top) => clampChipPosition({ left, top });
		  const onPointerDown = (event) => {
		    const box = event.currentTarget.getBoundingClientRect();
		    drag.current = {
		      pointerId: event.pointerId,
		      offsetX: event.clientX - box.left,
		      offsetY: event.clientY - box.top,
		      startX: event.clientX,
		      startY: event.clientY,
		      moved: false
		    };
		    try {
		      event.currentTarget.setPointerCapture(event.pointerId);
		    } catch {
		    }
		  };
		  const onPointerMove = (event) => {
		    const state = drag.current;
		    if (state === null || state.pointerId !== event.pointerId) return;
		    if (Math.abs(event.clientX - state.startX) + Math.abs(event.clientY - state.startY) > 3) {
		      state.moved = true;
		    }
		    if (!state.moved) return;
		    onMove(clamp(event.clientX - state.offsetX, event.clientY - state.offsetY));
		  };
		  const endDrag = (event) => {
		    const state = drag.current;
		    if (state === null || state.pointerId !== event.pointerId) return;
		    suppressClick.current = state.moved;
		    drag.current = null;
		    try {
		      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		        event.currentTarget.releasePointerCapture(event.pointerId);
		      }
		    } catch {
		    }
		  };
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		    "button",
		    {
		      ref: buttonRef,
		      type: "button",
		      className: `dsht_chip${position === null ? "" : " dsht_chipPinned"}`,
		      style: position === null ? void 0 : { left: position.left, top: position.top, right: "auto", bottom: "auto" },
		      "aria-label": "\u6253\u5F00\u4FC4\u7F57\u65AF\u65B9\u5757",
		      title: "\u4FC4\u7F57\u65AF\u65B9\u5757",
		      onPointerDown,
		      onPointerMove,
		      onPointerUp: endDrag,
		      onPointerCancel: endDrag,
		      onClick: () => {
		        if (suppressClick.current) {
		          suppressClick.current = false;
		          return;
		        }
		        onOpen();
		      },
		      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 58 38", width: "26", height: "17", "aria-hidden": "true", focusable: "false", children: [
		        [1, 0],
		        [0, 1],
		        [1, 1],
		        [2, 1]
		      ].map(([col, row]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        "rect",
		        {
		          x: col * 20,
		          y: row * 20,
		          width: 18,
		          height: 18,
		          rx: 3,
		          fill: "#a86bff"
		        },
		        `${col}-${row}`
		      )) })
		    }
		  );
		}

		// src/client/index.tsx
		var import_jsx_runtime2 = require("react/jsx-runtime");
		var inject = ["slots"];
		var FOCUS_BINDING_KEY = "dsh-plugin-tetris.focus-binding";
		function readFocusBinding() {
		  try {
		    if (typeof window === "undefined") return true;
		    return window.localStorage.getItem(FOCUS_BINDING_KEY) !== "off";
		  } catch {
		    return true;
		  }
		}
		function writeFocusBinding(on) {
		  try {
		    if (typeof window === "undefined") return;
		    window.localStorage.setItem(FOCUS_BINDING_KEY, on ? "on" : "off");
		  } catch {
		  }
		}
		function anySessionRunning(snapshot) {
		  if (snapshot === void 0 || snapshot === null) return false;
		  for (const status of snapshot.values()) {
		    if (status?.running === true) return true;
		  }
		  return false;
		}
		function TetrisDock(props) {
		  const running = props.useSessionStatus(anySessionRunning);
		  const gameRef = React2.useRef(null);
		  if (gameRef.current === null) gameRef.current = new TetrisGame(2 /* ENDLESS */);
		  const game = gameRef.current;
		  const [focusBinding, setFocusBinding] = React2.useState(readFocusBinding);
		  const [open, setOpen] = React2.useState(() => focusBinding && running);
		  const [focusRequest, setFocusRequest] = React2.useState(0);
		  const [chipPosition, setChipPosition] = React2.useState(null);
		  const [openAt, setOpenAt] = React2.useState(
		    null
		  );
		  const chipRef = React2.useRef(null);
		  const [screen, setScreen] = React2.useState("menu");
		  const previousRunning = React2.useRef(running);
		  const openRef = React2.useRef(open);
		  openRef.current = open;
		  React2.useEffect(() => {
		    const wasRunning = previousRunning.current;
		    previousRunning.current = running;
		    if (running && !wasRunning) {
		      if (!openRef.current) {
		        setScreen("menu");
		        setOpenAt(null);
		        setFocusRequest(0);
		        setOpen(true);
		      }
		      return void 0;
		    }
		    if (!running && wasRunning && focusBinding) {
		      setFocusRequest((request) => request + 1);
		    }
		    return void 0;
		  }, [running, focusBinding]);
		  const openFromChip = () => {
		    const box = chipRef.current?.getBoundingClientRect();
		    setOpenAt(box === void 0 ? null : { left: box.left, top: box.top });
		    setScreen("menu");
		    setFocusRequest((request) => request + 1);
		    setOpen(true);
		  };
		  React2.useEffect(() => {
		    const onResize = () => {
		      setChipPosition(
		        (current) => current === null ? current : clampChipPosition(current)
		      );
		    };
		    window.addEventListener("resize", onResize);
		    return () => window.removeEventListener("resize", onResize);
		  }, []);
		  const toggleFocusBinding = () => {
		    setFocusBinding((current) => {
		      const next = !current;
		      writeFocusBinding(next);
		      return next;
		    });
		  };
		  const resumeGame = () => {
		    setScreen("game");
		    setFocusRequest((request) => request + 1);
		  };
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsht_root", children: open ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		    TetrisPanel,
		    {
		      game,
		      screen,
		      focusRequest,
		      openAt,
		      focusBinding,
		      onToggleFocusBinding: toggleFocusBinding,
		      onResume: resumeGame,
		      onMenu: () => setScreen("menu"),
		      onChooseMode: (mode) => {
		        game.startMode(mode);
		        setScreen("game");
		        setFocusRequest((request) => request + 1);
		      },
		      onClose: () => setOpen(false)
		    }
		  ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		    TetrisChip,
		    {
		      position: chipPosition,
		      onMove: setChipPosition,
		      onOpen: openFromChip,
		      buttonRef: chipRef
		    }
		  ) });
		}
		function apply(ctx) {
		  installStyles();
		  ctx.slots.inject(
		    "shell.overlay",
		    () => ctx.slots.register({ name: "shell.overlay", id: "tetris", order: 50 }, TetrisDock)
		  );
		}

		return module.exports;
	}
});
