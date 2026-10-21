/**
 * End-of-game statistics.
 *
 * Ported from `tetris-terminal/src/tetris/settlement_message.py` (MIT, by
 * jayzhu). The terminal `format(width)` helper is kept (the browser UI renders
 * the fields directly, but parity is useful in tests) with one deviation: a
 * no-progress guard, because upstream's loop can spin forever when a single
 * message is wider than the half-width column.
 */

export interface SettlementFields {
  score: number;
  lines: number;
  time: string;
  single: number;
  double: number;
  triple: number;
  tetris: number;
  tSpin: number;
  tSpinSingle: number;
  tSpinDouble: number;
  tSpinTriple: number;
  miniTSpin: number;
  miniTSpinSingle: number;
  gameMode: string;
}

export class SettlementMessage {
  title: string;
  readonly score: number;
  readonly lines: number;
  readonly time: string;
  readonly single: number;
  readonly double: number;
  readonly triple: number;
  readonly tetris: number;
  readonly tSpin: number;
  readonly tSpinSingle: number;
  readonly tSpinDouble: number;
  readonly tSpinTriple: number;
  readonly miniTSpin: number;
  readonly miniTSpinSingle: number;
  readonly gameMode: string;

  constructor(title: string, fields: SettlementFields) {
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
  format(width: number): string[] {
    const harfw = width >> 1;
    const msgs: string[] = [];
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
      `Mini-T-Spin Single: ${this.miniTSpinSingle}`,
    );

    const centre = (text: string, size: number): string => {
      if (text.length >= size) return text;
      const total = size - text.length;
      const left = Math.floor(total / 2);
      return " ".repeat(left) + text + " ".repeat(total - left);
    };

    const res: string[] = [];
    let i = 0;
    let curLine = "";
    while (i < msgs.length) {
      if (curLine.length + harfw > width || msgs[i].length > harfw) {
        if (curLine === "" && msgs[i].length > harfw) {
          // No-progress guard (upstream would loop forever here).
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
}
