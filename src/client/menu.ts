/**
 * Mode-selection menu, modelled on upstream's `ui/menu.py`.
 *
 * The TUI menu lists `Sections` (the `GameMode` names plus `QUIT`), moves with
 * up/down/tab and confirms with enter. This module keeps that vocabulary and
 * the key handling as pure data/functions so the whole thing is unit-testable
 * without a DOM; the presentation lives in `view.tsx`.
 */

import { GameMode } from "../core/enums.ts";

/** One row of the menu. */
export interface MenuSection {
  /** Stable identifier (also the React key). */
  key: string;
  /** Display label, matching upstream's section naming. */
  label: string;
  /** One-line explanation shown under the list. */
  description: string;
  /** Mode to start when confirmed; absent for the quit row. */
  mode?: GameMode;
  /** Present but not startable (with `description` explaining why). */
  disabled?: boolean;
}

/**
 * The menu rows, in upstream's order.
 *
 * `VERSUS` is listed because the TUI lists it, but this plugin has no
 * multiplayer transport, so it is disabled rather than silently missing.
 */
export const MENU_SECTIONS: readonly MenuSection[] = [
  {
    key: "150-lines",
    label: "150 LINES",
    description: "消满 150 行即结束",
    mode: GameMode.LINES_150,
  },
  {
    key: "casual",
    label: "CASUAL",
    description: "轻松模式，等级上限 5",
    mode: GameMode.CASUAL,
  },
  {
    key: "endless",
    label: "ENDLESS",
    description: "无尽模式，等级上限 15",
    mode: GameMode.ENDLESS,
  },
  {
    key: "digging",
    label: "DIGGING",
    description: "不断涌入垃圾行，等级上限 5",
    mode: GameMode.DIGGING,
  },
  {
    key: "time-attack",
    label: "TIME ATTACK",
    description: "2 分钟内尽可能多消行",
    mode: GameMode.TIME_ATTACK,
  },
  {
    key: "versus",
    label: "VERSUS",
    description: "需要联机服务器，本插件未实现",
    disabled: true,
  },
  {
    key: "quit",
    label: "QUIT",
    description: "收起面板，回到右下角胶囊",
  },
];

/** Horizontal rule art from upstream's title window. */
export const MENU_TITLE_ART: readonly string[] = [
  "━┏┛  ┏━┛  ━┏┛  ┏━┃  ━┏┛  ┏━┛",
  " ┃   ┏━┛   ┃   ┏┏┛   ┃   ━━┃",
  " ┛   ━━┛   ┛   ┛ ┛  ━━┛  ━━┛",
];

/** A menu navigation intent. */
export type MenuAction = "up" | "down" | "confirm";

/** Map a raw key string onto a menu action (`undefined` when unbound). */
export function menuActionForKey(key: string): MenuAction | undefined {
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
      return undefined;
  }
}

/** Move the selection, wrapping at both ends (upstream wraps too). */
export function stepSelection(
  index: number,
  action: "up" | "down",
  sections: readonly MenuSection[] = MENU_SECTIONS,
): number {
  const count = sections.length;
  if (count === 0) return 0;
  const next = action === "up" ? index - 1 : index + 1;
  return ((next % count) + count) % count;
}

/** Index of a mode's row, or -1. Used to preselect the last played mode. */
export function indexOfMode(
  mode: GameMode,
  sections: readonly MenuSection[] = MENU_SECTIONS,
): number {
  return sections.findIndex((section) => section.mode === mode);
}

/** Locale hint line, mirroring upstream's notice window. */
export const MENU_HINT = "↑ ↓ 选择 · Tab 下一个 · Enter 开始";
