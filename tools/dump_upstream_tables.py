"""Dump upstream ROTATE_TABLE / SHAPE_TABLE as JSON for cross-checking the TS port.

Python 3.10 lacks enum.StrEnum (used only by the multiplayer enums), so shim it
before importing the package.
"""

import enum
import json
import os
import sys

if not hasattr(enum, "StrEnum"):

    class StrEnum(str, enum.Enum):
        pass

    enum.StrEnum = StrEnum  # type: ignore[attr-defined]

if len(sys.argv) < 2:
    raise SystemExit("usage: dump_upstream_tables.py <path-to-tetris-terminal-checkout>")

sys.path.insert(0, os.path.join(os.path.abspath(sys.argv[1]), "src"))

from tetris.constants import ROTATE_TABLE  # noqa: E402
from tetris.enums import TetriminoShape  # noqa: E402

out = {}
for shape in TetriminoShape.normal_tetriminos():
    per_shape = {}
    for (a, b), v in ROTATE_TABLE[shape].items():
        per_shape[f"{a.value},{b.value}"] = {
            "diff": [list(p) for p in v["standard_rotate_diff"]],
            "off": [list(p) for p in v["offsets"]],
        }
    out[str(shape.value)] = per_shape

print(json.dumps(out, sort_keys=True, indent=1))
