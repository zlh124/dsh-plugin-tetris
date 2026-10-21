/**
 * Render test for the panel component tree.
 *
 * The component is server-rendered (no DOM, no effects) against a stand-in for
 * the Session standard props. This catches the class of runtime breakage the
 * engine tests and the bundle-envelope test cannot see: bad props, a broken
 * component tree, or visibility gating that does not actually gate.
 */

import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, before, after } from "node:test";

import { build } from "esbuild";
import * as React from "react";
import { renderToString } from "react-dom/server";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, ".test-build");
const outFile = resolve(outDir, "client.mjs");

let client;

before(async () => {
  // Starting a game begins its animation loop; Node has no rAF.
  globalThis.requestAnimationFrame = (callback) =>
    setTimeout(() => callback(performance.now()), 1);
  globalThis.cancelAnimationFrame = (handle) => clearTimeout(handle);
  await mkdir(outDir, { recursive: true });
  await build({
    entryPoints: [resolve(root, "src/client/index.tsx")],
    outfile: outFile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    logLevel: "warning",
  });
  client = await import(pathToFileURL(outFile).href);
});

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 30));
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
  await rm(outDir, { recursive: true, force: true });
});

/** Stand-in for the framework-injected Session status selector hook. */
const statusProp = (running) => () => running;

test("client half exports the cordis plugin shape", () => {
  assert.equal(typeof client.apply, "function");
  assert.ok(Array.isArray(client.inject));
  assert.ok(client.inject.includes("slots"));
});

test("the panel opens on the menu while the agent is working", () => {
  // Opening is always the menu page now, even for an agent-triggered open.
  const html = renderToString(
    React.createElement(client.TetrisDock, { useSessionStatus: statusProp(true) }),
  );
  assert.match(html, /dsht_panel/, "expected the floating panel");
  assert.match(html, /俄罗斯方块/);
  assert.match(html, /dsht_menu/, "the mode menu is the landing page");
  assert.doesNotMatch(html, /dsht_canvas/, "no playfield until a mode is chosen");
  assert.match(html, /data-dsht-mode="endless"/);
});

test("an idle agent shows the chip, never the panel", () => {
  // The chip is the persistent entry point: without it, a page refresh while
  // the agent is idle would leave no way into the game at all.
  const html = renderToString(
    React.createElement(client.TetrisDock, { useSessionStatus: statusProp(false) }),
  );
  assert.match(html, /dsht_chip/, "the entry point must survive an idle refresh");
  assert.doesNotMatch(html, /dsht_panel/, "the panel itself stays closed while idle");
  assert.match(html, /俄罗斯方块/);
});

test("a missing or empty status snapshot reads as idle (chip only)", () => {
  // The selector must survive the pre-baseline state without throwing.
  const html = renderToString(
    React.createElement(client.TetrisDock, {
      useSessionStatus: (selector) => selector(new Map()),
    }),
  );
  assert.match(html, /dsht_chip/);
  assert.doesNotMatch(html, /dsht_panel/);
});

test("panel exposes the documented controls", () => {
  const html = renderToString(
    React.createElement(client.TetrisDock, { useSessionStatus: statusProp(true) }),
  );
  // On the menu page: the conversation toggle and the close button. Gameplay
  // controls only exist once a mode is running.
  assert.match(html, /data-dsht-action="focus-binding"/);
  assert.match(html, /data-dsht-focus-binding="1"/);
  assert.match(html, /checked=""/, "a bound game renders the slider on");
  assert.match(html, /dsht_switchTrack/, "the slider is drawn");
  assert.match(html, /焦点联动/, "the caption names the feature");
  assert.doesNotMatch(html, /dsht_switchLabel/, "no on/off wording on the slider");
  assert.match(html, /data-dsht-action="close"/);
  assert.doesNotMatch(html, /data-dsht-action="pause"/);
  assert.doesNotMatch(html, /data-dsht-action="restart"/);
  // The key legend is game-page only (the menu has its own hint line).
  assert.match(html, /↑ ↓ 选择/);
});

/**
 * Build the panel component and the controller as standalone ESM so they can
 * be rendered directly (the bundle entry only exposes the cordis plugin).
 */
async function loadPanel() {
  const buildModule = async (entry, name) => {
    const out = resolve(outDir, name);
    await build({
      entryPoints: [resolve(root, entry)],
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      jsx: "automatic",
      external: ["react", "react-dom", "react/jsx-runtime"],
      logLevel: "warning",
    });
    return import(pathToFileURL(out).href);
  };
  return {
    view: await buildModule("src/client/view.tsx", "view.mjs"),
    game: await buildModule("src/client/game.ts", "game.mjs"),
  };
}

/** Render the panel with every required prop supplied. */
function panelProps(game, screen = "game") {
  return {
    game,
    screen,
    focusRequest: 0,
    focusBinding: true,
    onToggleFocusBinding: () => {},
    onMenu: () => {},
    onChooseMode: () => {},
    onResume: () => {},
    onClose: () => {},
  };
}

test("the notice popup renders per-tier styling beside the board", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2 /* GameMode.ENDLESS */);

  const render = (notice) => {
    // White-box: force the engine's notice, exactly as a lock-down would.
    game.core._setNotice(notice);
    return renderToString(React.createElement(view.TetrisPanel, panelProps(game)));
  };

  const single = render("Single!");
  assert.match(single, /dsht_notice dsht_noticeSingle/, "a single is its own tier");
  assert.match(single, /Single!/);
  assert.doesNotMatch(single, /dsht_noticeB2b/, "no badge without B2B");

  const tetris = render("Tetris! B2B!");
  assert.match(tetris, /dsht_noticeTetris/);
  assert.match(tetris, /dsht_noticeB2b/, "B2B gets a badge");
  assert.doesNotMatch(tetris, /Tetris! B2B!<\/span>/, "the suffix is not repeated in the label");

  const tspin = render("T-Spin Double! B2B!");
  assert.match(tspin, /dsht_noticeTspin/, "a T-Spin must not read as a plain double");
  assert.match(tspin, /dsht_noticeB2b/);

  const mini = render("T-Spin Mini!");
  assert.match(mini, /dsht_noticeMini/);

  const garbage = render("Garbage +4!");
  assert.match(garbage, /dsht_noticeGarbage/);
});

test("the paused notice is left to the board overlay, not the popup", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  game.core.togglePause();
  const html = renderToString(
    React.createElement(view.TetrisPanel, panelProps(game)),
  );
  // getNotice() reports PAUSED while paused; the popup must stay empty.
  assert.match(html, /已暂停/, "the board overlay still announces the pause");
  assert.doesNotMatch(html, /dsht_notice dsht_notice/, "no duplicate popup");
});

test("without a notice the popup box is empty but present", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  const html = renderToString(
    React.createElement(view.TetrisPanel, panelProps(game)),
  );
  assert.match(html, /dsht_noticeBox/, "the layout keeps its notice seat");
  assert.doesNotMatch(html, /dsht_notice dsht_notice/);
});

test("the menu screen lists every upstream section", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  const html = renderToString(
    React.createElement(view.TetrisPanel, panelProps(game, "menu")),
  );

  assert.match(html, /dsht_menu/, "the menu page must render");
  assert.doesNotMatch(html, /dsht_board/, "the playfield is not on the menu page");

  // Upstream's Sections order: 150 LINES, CASUAL, ENDLESS, DIGGING,
  // TIME ATTACK, VERSUS, QUIT. Order is checked on the stable row hooks: the
  // header also renders the current mode's label, so text search would lie.
  const rows = [
    ["150-lines", "150 LINES"],
    ["casual", "CASUAL"],
    ["endless", "ENDLESS"],
    ["digging", "DIGGING"],
    ["time-attack", "TIME ATTACK"],
    ["versus", "VERSUS"],
    ["quit", "QUIT"],
  ];
  const positions = rows.map(([key]) => html.indexOf(`data-dsht-mode="${key}"`));
  rows.forEach(([, label], i) => {
    assert.ok(positions[i] > -1, `menu is missing the ${label} row`);
  });
  assert.deepEqual(
    [...positions].sort((a, b) => a - b),
    positions,
    "rows must keep upstream's section order",
  );
  assert.equal(
    (html.match(/data-dsht-mode=/g) || []).length,
    rows.length,
    "one row per section",
  );

  // The highlighted row is the default mode (ENDLESS).
  const active = /data-dsht-mode="([^"]+)"[^>]*class="[^"]*dsht_menuItemActive/.exec(html);
  assert.ok(active !== null, "some row must be highlighted");
  assert.equal(active[1], "endless", "ENDLESS is preselected");
  // The block title from upstream's title window is reused verbatim.
  assert.match(html, /━┏┛/);
  // VERSUS is present but not startable.
  assert.match(html, /dsht_menuItemDisabled/);
});

test("the game page exposes the gameplay controls", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  const html = renderToString(
    React.createElement(view.TetrisPanel, panelProps(game, "game")),
  );
  assert.match(html, /data-dsht-action="focus-binding"/);
  assert.match(html, /data-dsht-action="menu"/, "a way back to the mode menu");
  assert.match(html, /data-dsht-action="pause"/);
  assert.match(html, /data-dsht-action="restart"/);
  assert.match(html, /data-dsht-action="close"/);
  // The key legend documents the engine's bindings.
  for (const hint of ["移动", "顺时针", "逆时针", "软降", "硬降", "Hold", "暂停"]) {
    assert.ok(html.includes(hint), `key legend is missing "${hint}"`);
  }
});

test("an unbound game reflects it in the toggle", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  const html = renderToString(
    React.createElement(view.TetrisPanel, {
      ...panelProps(game, "game"),
      focusBinding: false,
    }),
  );
  assert.match(html, /data-dsht-focus-binding="0"/);
});

test("the menu offers a way back to a paused game", async () => {
  const { view, game: gameMod } = await loadPanel();
  const game = new gameMod.TetrisGame(2);
  game.startMode(2);
  game.core.score = 700;
  game.stop();
  // Not over, so the menu must offer resuming rather than only a new game.
  const html = renderToString(
    React.createElement(view.TetrisPanel, panelProps(game, "menu")),
  );
  assert.match(html, /data-dsht-action="resume"/);
  assert.match(html, /继续上次对局/);
  assert.match(html, /700/);
});
