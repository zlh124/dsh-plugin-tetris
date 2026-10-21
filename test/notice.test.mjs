/**
 * Unit tests for the notice classifier.
 *
 * The strings these tests feed in are exactly the ones `_buildNotice` and
 * `addGarbageLines` produce; `test/core.test.ts` pins that vocabulary from the
 * engine side, so this file pins the string -> tier mapping.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyNotice,
  isDisplayableNotice,
  PAUSED_NOTICE,
  tierClass,
} from "../src/client/notice.ts";

/** Every string the engine can hand to the UI. */
const ENGINE_NOTICES = [
  ["Single!", "single"],
  ["Double!", "double"],
  ["Triple!", "triple"],
  ["Tetris!", "tetris"],
  ["T-Spin!", "tspin"],
  ["T-Spin Single!", "tspin"],
  ["T-Spin Double!", "tspin"],
  ["T-Spin Triple!", "tspin"],
  ["T-Spin Mini!", "mini"],
  ["T-Spin Mini Single!", "mini"],
  ["Garbage +4!", "garbage"],
];

test("every engine notice maps to a tier", () => {
  for (const [notice, tier] of ENGINE_NOTICES) {
    const style = classifyNotice(notice);
    assert.equal(style.tier, tier, `${notice} should be tier ${tier}`);
    assert.equal(style.label, notice, "the label keeps the text unchanged");
    assert.equal(style.b2b, false);
  }
});

test("a T-Spin is never mistaken for a plain clear", () => {
  // Order of the checks matters: "T-Spin Double!" starts with neither but
  // "T-Spin Mini Single!" also contains "Single".
  assert.equal(classifyNotice("T-Spin Double!").tier, "tspin");
  assert.equal(classifyNotice("T-Spin Mini Single!").tier, "mini");
  assert.equal(classifyNotice("T-Spin Mini!").tier, "mini");
  assert.equal(classifyNotice("Double!").tier, "double");
});

test("the B2B suffix is stripped into its own flag", () => {
  const style = classifyNotice("Tetris! B2B!");
  assert.equal(style.tier, "tetris", "the tier comes from the clear, not the suffix");
  assert.equal(style.label, "Tetris!", "the label must not repeat the suffix");
  assert.equal(style.b2b, true);

  const tSpin = classifyNotice("T-Spin Double! B2B!");
  assert.equal(tSpin.tier, "tspin");
  assert.equal(tSpin.label, "T-Spin Double!");
  assert.equal(tSpin.b2b, true);
});

test("tier classes are the CSS suffix the view uses", () => {
  assert.equal(tierClass("single"), "Single");
  assert.equal(tierClass("tspin"), "Tspin");
  assert.equal(tierClass("mini"), "Mini");
  assert.equal(tierClass("garbage"), "Garbage");
  assert.equal(tierClass("tetris"), "Tetris");
});

test("an empty notice and PAUSED are not shown in the popup", () => {
  // The board renders its own paused overlay, so PAUSED would be duplicated.
  assert.equal(isDisplayableNotice(""), false);
  assert.equal(isDisplayableNotice(PAUSED_NOTICE), false);
  assert.equal(isDisplayableNotice("Single!"), true);
  assert.equal(isDisplayableNotice("Tetris! B2B!"), true);
});
