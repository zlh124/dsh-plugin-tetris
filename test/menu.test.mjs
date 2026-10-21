/**
 * Unit tests for the mode menu's data and key handling.
 *
 * The presentation is covered by the panel render test; this file pins the
 * section list (upstream's `Sections` order) and the navigation rules.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { GameMode } from "../src/core/enums.ts";
import {
  indexOfMode,
  MENU_SECTIONS,
  menuActionForKey,
  stepSelection,
} from "../src/client/menu.ts";

test("sections keep upstream's order and labels", () => {
  assert.deepEqual(
    MENU_SECTIONS.map((section) => section.label),
    ["150 LINES", "CASUAL", "ENDLESS", "DIGGING", "TIME ATTACK", "VERSUS", "QUIT"],
  );
  assert.deepEqual(
    MENU_SECTIONS.map((section) => section.key),
    ["150-lines", "casual", "endless", "digging", "time-attack", "versus", "quit"],
  );
});

test("every single-player mode has a startable row", () => {
  const startable = MENU_SECTIONS.filter(
    (section) => section.mode !== undefined && section.disabled !== true,
  ).map((section) => section.mode);

  for (const mode of [
    GameMode.LINES_150,
    GameMode.CASUAL,
    GameMode.ENDLESS,
    GameMode.DIGGING,
    GameMode.TIME_ATTACK,
  ]) {
    assert.ok(startable.includes(mode), `GameMode ${mode} must be selectable`);
  }
});

test("versus is listed but disabled, and quit is not a mode", () => {
  const versus = MENU_SECTIONS.find((section) => section.key === "versus");
  assert.ok(versus !== undefined, "versus row must exist (upstream lists it)");
  assert.equal(versus.disabled, true);
  assert.equal(versus.mode, undefined, "versus cannot start without a transport");
  assert.ok(
    versus.description.length > 0,
    "a disabled row must say why it is disabled",
  );

  const quit = MENU_SECTIONS.find((section) => section.key === "quit");
  assert.ok(quit !== undefined);
  assert.equal(quit.mode, undefined, "quit starts nothing");
  assert.equal(quit.disabled, undefined, "quit is a real action, not a dead row");
});

test("every startable row explains itself", () => {
  for (const section of MENU_SECTIONS) {
    assert.ok(
      section.description.length > 0,
      `section ${section.key} needs a description line`,
    );
  }
});

test("key handling mirrors upstream's menu", () => {
  // Upstream: KEY_UP moves up; KEY_DOWN and TAB move down; enter confirms.
  assert.equal(menuActionForKey("ArrowUp"), "up");
  assert.equal(menuActionForKey("ArrowDown"), "down");
  assert.equal(menuActionForKey("Tab"), "down");
  assert.equal(menuActionForKey("Enter"), "confirm");
  // Gameplay keys must not be swallowed by the menu.
  assert.equal(menuActionForKey(" "), undefined);
  assert.equal(menuActionForKey("a"), undefined);
  assert.equal(menuActionForKey("p"), undefined);
});

test("selection wraps at both ends", () => {
  const last = MENU_SECTIONS.length - 1;
  assert.equal(stepSelection(0, "up"), last, "up from the first wraps to the last");
  assert.equal(stepSelection(last, "down"), 0, "down from the last wraps to the first");
  assert.equal(stepSelection(2, "down"), 3);
  assert.equal(stepSelection(2, "up"), 1);
});

test("the last played mode can be preselected", () => {
  assert.equal(indexOfMode(GameMode.ENDLESS), 2);
  assert.equal(indexOfMode(GameMode.LINES_150), 0);
  assert.equal(indexOfMode(GameMode.TIME_ATTACK), 4);
  // A mode with no row reports -1 so callers can fall back.
  assert.equal(indexOfMode(GameMode.VERSUS), -1);
});
