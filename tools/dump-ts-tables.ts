/**
 * Dump the ported ROTATE_TABLE as JSON in the same shape as
 * `tools/dump_upstream_tables.py`, so the two can be diffed byte-for-byte.
 */

import { rotationEntry } from "../src/core/constants.ts";
import { DIRECTIONS, NORMAL_TETRIMINOS } from "../src/core/enums.ts";

const out: Record<string, Record<string, { diff: number[][]; off: number[][] }>> = {};

for (const shape of NORMAL_TETRIMINOS) {
  const perShape: Record<string, { diff: number[][]; off: number[][] }> = {};
  for (const start of DIRECTIONS) {
    for (const end of DIRECTIONS) {
      if (start === end) continue;
      const entry = rotationEntry(shape, start, end);
      if (entry === undefined) continue;
      perShape[`${start},${end}`] = {
        diff: entry.standardRotateDiff.map((p) => [p[0], p[1]]),
        off: entry.offsets.map((p) => [p[0], p[1]]),
      };
    }
  }
  out[String(shape)] = perShape;
}

process.stdout.write(JSON.stringify(out, null, 1));
