/**
 * Real-browser test of the built artifact.
 *
 * The SSR test proves the component tree renders; this one proves the artifact
 * works in the environment it actually ships into. It builds a harness page
 * that:
 *
 *   1. installs the same `window.__ModuleLoader__` queue facade the shipped
 *      shell installs (shape copied from the shell's built index bundle),
 *   2. loads the real `lib/client.js` exactly as a classic <script> would,
 *   3. materializes the factory with a `require` that only answers the two
 *      platform modules the bundle is allowed to ask for,
 *   4. renders the registered component with real React into a real DOM, and
 *   5. reads pixels back out of the board canvas.
 *
 * That last step is the point: `requestAnimationFrame`, `devicePixelRatio`,
 * a real 2D context, pointer capture and <style> injection are all things that
 * can pass under SSR and still be broken in a browser.
 *
 * Skips (loudly) when Chrome is unavailable.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test, before, after } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = resolve(root, ".test-browser");
const profileDir = resolve(workDir, "chrome-profile");
const harnessPath = resolve(workDir, "harness.html");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((candidate) => typeof candidate === "string");

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
const skipReason = `no Chrome found; looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}`;

function readDep(relativePath) {
  const full = resolve(root, "node_modules", relativePath);
  assert.ok(existsSync(full), `missing devDependency file ${full} — run \`npm install\``);
  return readFileSync(full, "utf8");
}

let chromeOutput;

before(() => {
  if (chromePath === undefined) return;

  mkdirSync(workDir, { recursive: true });
  mkdirSync(profileDir, { recursive: true });

  // Keep the big dependency bodies OUT of the dumped DOM: write them as
  // sibling files and load them with <script src>. Inlining them made
  // `--dump-dom` emit >1 MB and blow the child_process buffer.
  writeFileSync(
    resolve(workDir, "client.js"),
    readFileSync(resolve(root, "lib/client.js"), "utf8"),
    "utf8",
  );
  writeFileSync(resolve(workDir, "react.js"), readDep("react/umd/react.development.js"), "utf8");
  writeFileSync(
    resolve(workDir, "react-dom.js"),
    readDep("react-dom/umd/react-dom.development.js"),
    "utf8",
  );
  writeFileSync(
    resolve(workDir, "jsx-runtime.cjs.js"),
    readDep("react/cjs/react-jsx-runtime.development.js"),
    "utf8",
  );

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>tetris harness</title></head>
<body>
<div id="root-idle"></div>
<div id="root"></div>
<pre id="result">pending</pre>

<script>
  window.__errors = [];
  window.addEventListener("error", (event) => window.__errors.push(String(event.message)));
  window.addEventListener("unhandledrejection", (event) => window.__errors.push("unhandledrejection: " + String(event.reason)));
  const originalError = console.error;
  console.error = function (...args) {
    window.__errors.push(args.map((a) => String(a)).join(" "));
    originalError.apply(console, args);
  };

  // The shell's platform table holds browser builds with NODE_ENV baked in.
  // The npm CJS/UMD files we load here read process.env instead, so provide
  // exactly what a bundler would have substituted.
  window.process = window.process || { env: { NODE_ENV: "development" } };

  // Headless Chrome never produces frames (no compositor), so
  // requestAnimationFrame callbacks never fire -- measured, not assumed. The
  // plugin's loop is intentionally rAF-driven (that is what makes the game
  // pause when the tab is hidden), so drive it from timers here instead. This
  // is a harness accommodation only; the shipped code is untouched.
  window.requestAnimationFrame = function (callback) {
    return window.setTimeout(function () { callback(performance.now()); }, 16);
  };
  window.cancelAnimationFrame = function (handle) {
    window.clearTimeout(handle);
  };

  /** Minimal CommonJS evaluation, enough for react/jsx-runtime. */
  window.__loadCjs = function (src, requireFn) {
    const module = { exports: {} };
    new Function("module", "exports", "require", "process", src)(
      module, module.exports, requireFn, window.process,
    );
    return module.exports;
  };
</script>

<script src="react.js"></script>
<script src="react-dom.js"></script>
<script>
  window.__jsxRuntime = window.__loadCjs(
    ${JSON.stringify(readFileSync(resolve(workDir, "jsx-runtime.cjs.js"), "utf8"))},
    (id) => {
      if (id === "react") return window.React;
      throw new Error("harness: unexpected require " + id);
    },
  );
</script>

<script>
  // The shipped shell installs this exact facade in <head> before any plugin
  // script runs, so plugin bundles are queued rather than executed.
  window.__ModuleLoader__ = (() => {
    const pendingQueue = [];
    return {
      mode: "queue",
      pendingQueue,
      load(registration) { pendingQueue.push(registration); },
      create() { throw new Error("harness: create() is not used"); }
    };
  })();
</script>

<script src="client.js"></script>

<script>
(async function () {
  const result = { ok: false };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    const registrations = window.__ModuleLoader__.pendingQueue;
    result.registrationCount = registrations.length;
    const registration = registrations[0];
    result.registrationId = registration && registration.id;

    const requested = [];
    const requireFn = (specifier) => {
      requested.push(specifier);
      if (specifier === "react") return window.React;
      if (specifier === "react/jsx-runtime") return window.__jsxRuntime;
      throw new Error("harness: bundle requested non-platform module " + specifier);
    };
    const plugin = registration.factory(requireFn);
    result.requested = Array.from(new Set(requested)).sort();
    result.hasApply = typeof plugin.apply === "function";
    result.inject = plugin.inject;

    // Stand in for the renderer: capture the definition + component instead of
    // mounting through the real slot machinery.
    let captured = null;
    const ctx = {
      slots: {
        inject(name, factory) { factory(); },
        register(definition, component) { captured = { definition, component }; return () => {}; }
      }
    };
    plugin.apply(ctx);
    result.definition = captured && captured.definition;
    result.styleTags = document.querySelectorAll('style[data-plugin-css]').length;

    const React = window.React;
    const ReactDOM = window.ReactDOM;

    // A status snapshot stand-in: SessionStatusSnapshot is a Map keyed by
    // session id. The hook is a plain selector call here; the harness drives
    // re-renders itself, exactly where the real store would notify.
    const RUNNING = new Map([["s1", { running: true }]]);
    const IDLE = new Map([["s1", { running: false }]]);
    let status = IDLE;
    const useSessionStatus = (selector) => selector(status);

    // ---- Part A: a fresh mount while the agent is idle ----
    // This is the page-refresh-with-nothing-running case: the chip must be
    // there, because it is the only way back into the game.
    const idleContainer = document.getElementById("root-idle");
    const idleRoot = ReactDOM.createRoot(idleContainer);
    idleRoot.render(React.createElement(captured.component, { useSessionStatus }));
    await wait(200);
    result.idleHasChip = idleContainer.querySelector(".dsht_chip") !== null;
    result.idleHasPanel = idleContainer.querySelector(".dsht_panel") !== null;

    // The chip is the classic T tetrimino in a circle, with no text.
    const idleChip = idleContainer.querySelector(".dsht_chip");
    if (idleChip !== null) {
      result.chipRadius = getComputedStyle(idleChip).borderRadius;
      result.chipIconCells = idleChip.querySelectorAll("svg rect").length;
      result.chipText = (idleChip.textContent || "").trim();
      result.chipBox = (() => {
        const box = idleChip.getBoundingClientRect();
        return [Math.round(box.width), Math.round(box.height)];
      })();

      // Drag it somewhere else: it must move, stay on screen, and NOT open.
      const before = idleChip.getBoundingClientRect();
      const press = (type, x, y) =>
        idleChip.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 7,
            isPrimary: true,
            clientX: x,
            clientY: y,
          }),
        );
      press("pointerdown", before.left + 22, before.top + 22);
      press("pointermove", 130, 110);
      press("pointerup", 130, 110);
      // Browsers synthesise a click when a drag is released on the same
      // element; the chip must swallow exactly that one.
      idleChip.click();
      await wait(150);
      const dragged = idleChip.getBoundingClientRect();
      result.chipMoved =
        Math.abs(dragged.left - before.left) > 20 ||
        Math.abs(dragged.top - before.top) > 20;
      result.chipDragDidNotOpen =
        idleContainer.querySelector(".dsht_panel") === null;
      result.chipOnScreen =
        dragged.left >= 0 &&
        dragged.top >= 0 &&
        dragged.right <= window.innerWidth &&
        dragged.bottom <= window.innerHeight;

      // A click (no movement) opens the panel AT the chip, fully on screen.
      idleChip.click();
      await wait(250);
      const opened = idleContainer.querySelector(".dsht_panel");
      if (opened !== null) {
        const panelBox = opened.getBoundingClientRect();
        result.panelOpenedNearChip =
          Math.abs(panelBox.left - dragged.left) <= 24 &&
          Math.abs(panelBox.top - dragged.top) <= 24;
        result.panelWithinViewport =
          panelBox.left >= 0 &&
          panelBox.top >= 0 &&
          panelBox.right <= window.innerWidth &&
          panelBox.bottom <= window.innerHeight;
      }
    }
    result.menuOnFirstOpen = idleContainer.querySelector(".dsht_menu") !== null;
    result.menuRows = idleContainer.querySelectorAll("[data-dsht-mode]").length;
    result.menuActive = idleContainer
      .querySelector(".dsht_menuItemActive")
      ?.getAttribute("data-dsht-mode");

    // The block title only lines up if every glyph advances the same amount.
    // Measure the real computed font: CJK monospace faces draw box-drawing
    // characters at full width, which is what skewed the art.
    const title = idleContainer.querySelector(".dsht_menuTitle");
    if (title !== null) {
      const style = getComputedStyle(title);
      const probe = document.createElement("span");
      probe.style.cssText = [
        "position:absolute",
        "visibility:hidden",
        "white-space:pre",
        "font-family:" + style.fontFamily,
        "font-size:" + style.fontSize,
        "letter-spacing:0",
        "font-variant-ligatures:none",
      ].join(";");
      document.body.appendChild(probe);
      const advance = (text) => {
        probe.textContent = text;
        return probe.getBoundingClientRect().width;
      };
      result.titleAdvances = {
        heavyHorizontal: advance("━"),
        heavyVertical: advance("┃"),
        corner: advance("┏"),
        space: advance(" "),
        latin: advance("A"),
      };
      result.titleLineWidth = title.getBoundingClientRect().width;
      result.titleCharsPerLine = 28; // every art row is padded to this
      probe.remove();
    }

    // Choosing a mode starts that mode and shows the playfield.
    result.menuPanelHeight = idleContainer.querySelector(".dsht_panel")?.offsetHeight;

    const timeAttack = idleContainer.querySelector('[data-dsht-mode="time-attack"]');
    if (timeAttack !== null) {
      timeAttack.click();
      await wait(250);
    }
    result.menuClosedAfterChoose =
      idleContainer.querySelector(".dsht_menu") === null;
    result.boardAfterChoose =
      idleContainer.querySelector("canvas.dsht_board") !== null;
    result.modeAfterChoose = idleContainer.querySelector(".dsht_mode")?.textContent;
    result.gamePanelHeight = idleContainer.querySelector(".dsht_panel")?.offsetHeight;
    // Leaving the menu must hand the keyboard to the board, otherwise the game
    // looks frozen until the player clicks it.
    const active = document.activeElement;
    result.focusAfterChoose =
      active !== null && (active.className || "").includes("dsht_panel");

    // ---- Part B: the agent starts working ----
    const container = document.getElementById("root");
    const reactRoot = ReactDOM.createRoot(container);
    status = RUNNING;
    reactRoot.render(React.createElement(captured.component, { useSessionStatus }));
    await wait(600);

    // Opening is bound to the conversation: the panel appears on the menu and
    // must NOT grab the keyboard (the player may be typing to the agent).
    result.autoOpenOnMenu = container.querySelector(".dsht_menu") !== null;
    result.autoOpenBoard = container.querySelector("canvas.dsht_board") !== null;
    result.autoOpenStoleFocus =
      document.activeElement !== null &&
      container.querySelector(".dsht_panel")?.contains(document.activeElement) === true;

    // Pick a mode to reach the playfield.
    const endlessRow = container.querySelector('[data-dsht-mode="endless"]');
    if (endlessRow !== null) {
      endlessRow.click();
      await wait(300);
    }

    const panel = container.querySelector(".dsht_panel");
    result.panelPresent = panel !== null;
    if (panel !== null) {
      result.canvasCount = container.querySelectorAll("canvas.dsht_canvas").length;
      // The board is the centre canvas, not merely the first one in the DOM
      // (hold comes first in document order).
      const board = container.querySelector("canvas.dsht_board");
      if (board !== null) {
        result.boardPixels = [board.width, board.height];
        const context2d = board.getContext("2d");
        const pixels = context2d.getImageData(0, 0, board.width, board.height).data;
        let painted = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 8) painted += 1;
        }
        result.paintedPixels = painted;
      }
      // Regression: during play nothing may be stacked over the playfield.
      // An absolutely-positioned hint used to sit on top of the bottom rows.
      result.centerChildren = container.querySelectorAll(".dsht_center > *").length;
      result.boardOverlays = container.querySelectorAll(
        ".dsht_center .dsht_focusHint, .dsht_center .dsht_overlay",
      ).length;
      // The Hold and Next wells: themed, rounded, wrapping the canvases.
      const wells = Array.from(container.querySelectorAll(".dsht_slot"));
      result.slotCount = wells.length;
      if (wells.length > 0) {
        const wellStyle = getComputedStyle(wells[0]);
        result.slotRadius = wellStyle.borderRadius;
        result.slotBackground = wellStyle.backgroundColor;
        result.slotCanvases = wells.reduce(
          (total, well) => total + well.querySelectorAll("canvas").length,
          0,
        );
        // Every well must be exactly the same size, and the two side columns
        // must be the same width so the board sits centred.
        result.slotSizes = Array.from(
          new Set(
            wells.map((well) => {
              const box = well.getBoundingClientRect();
              return box.width + "x" + box.height;
            }),
          ),
        );
        const leftCol = container.querySelector(".dsht_leftCol");
        const rightCol = container.querySelector(".dsht_rightCol");
        if (leftCol !== null && rightCol !== null) {
          result.columnWidths = [
            Math.round(leftCol.getBoundingClientRect().width),
            Math.round(rightCol.getBoundingClientRect().width),
          ];
        }
        // The Next column must keep a real gap between consecutive wells.
        const nextWells = Array.from(
          container.querySelectorAll(".dsht_nextList .dsht_slot"),
        );
        const gaps = [];
        for (let i = 1; i < nextWells.length; i += 1) {
          gaps.push(
            Math.round(
              nextWells[i].getBoundingClientRect().top -
                nextWells[i - 1].getBoundingClientRect().bottom,
            ),
          );
        }
        result.nextGaps = gaps;
      }
      // The wells must not push the panel wider than its own box.
      result.panelOverflow = panel.scrollWidth > panel.clientWidth + 1;
      result.headerDraggable = panel.querySelector(".dsht_header") !== null;
      result.buttons = Array.from(panel.querySelectorAll("button")).length;
      result.hasStats = panel.textContent.includes("分数");
      const linkBox = container.querySelector('[data-dsht-action="focus-binding"]');
      result.linkState = linkBox?.getAttribute("data-dsht-focus-binding");
      result.linkInputType = linkBox?.getAttribute("type");
      result.linkChecked = linkBox?.checked === true;
      // The caption names the feature; the state must not leak into it.
      result.switchCaption = (
        container.querySelector(".dsht_switchText")?.textContent || ""
      ).trim();
      // The preview pieces must actually fill their wells, not sit tiny in
      // the middle: measure the painted fraction of the first Next canvas.
      const preview = container.querySelector(".dsht_nextList canvas");
      if (preview !== null && preview.width > 0) {
        const data = preview
          .getContext("2d")
          .getImageData(0, 0, preview.width, preview.height).data;
        let paintedPixels = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 8) paintedPixels += 1;
        }
        result.previewFill = paintedPixels / (preview.width * preview.height);
      }
      const keys = panel.querySelector(".dsht_keys");
      if (keys !== null) {
        // The legend is a fixed-height, nowrap strip so the menu can match the
        // page height; it must not clip its own text.
        result.keysClipped = keys.scrollWidth > keys.clientWidth + 1;
        result.keysText = keys.textContent;
      }
      // The engine must be advancing in the browser, not frozen: MM:SS:CC.
      result.statsText = (panel.querySelector(".dsht_stats") || {}).textContent || "";
      result.clockMoving = /00:00:[0-9][0-9]/.test(panel.textContent);
    }

    // ---- Part C: the conversation ends ----
    // The ONLY reaction is handing focus back. No auto-pause, no auto-collapse.
    status = IDLE;
    reactRoot.render(React.createElement(captured.component, { useSessionStatus }));
    await wait(500);
    result.panelAfterStop = container.querySelector(".dsht_panel") !== null;
    result.pausedAfterStop =
      container.querySelector('[data-dsht-overlay="paused"]') !== null;
    const panelAfterStop = container.querySelector(".dsht_panel");
    result.stopGrabbedFocus =
      panelAfterStop !== null &&
      (document.activeElement === panelAfterStop ||
        panelAfterStop.contains(document.activeElement));

    // ---- Part D: closing the panel must not remove the entry point ----
    // Nothing auto-closes any more, so close it by hand first.
    container.querySelector('.dsht_panel button[data-dsht-action="close"]')?.click();
    await wait(200);
    result.panelAfterClose = container.querySelector(".dsht_panel") !== null;
    result.chipAfterClose = container.querySelector(".dsht_chip") !== null;

    const chip = container.querySelector(".dsht_chip");
    if (chip !== null) {
      chip.click();
      await wait(200);
    }
    result.panelAfterChipClick = container.querySelector(".dsht_panel") !== null;
    result.chipOpensMenu = container.querySelector(".dsht_menu") !== null;

    // ---- Part E: restarting a finished game must resume the simulation ----
    // The bug: reset() stopped the loop and never restarted it, so after
    // "play again" nothing fell and there was no shadow piece.
    const chipAgain = container.querySelector(".dsht_chip");
    if (chipAgain !== null) {
      chipAgain.click();
      await wait(200);
    }
    const endlessAgain = container.querySelector('[data-dsht-mode="endless"]');
    if (endlessAgain !== null) {
      endlessAgain.click();
      await wait(250);
    }
    let livePanel = container.querySelector(".dsht_panel");

    // Keyboard input must reach the engine. The game may already be paused
    // (the agent finishing pauses it), so assert a TOGGLE rather than a
    // direction: whatever the state was, P must flip it.
    const isPaused = () =>
      container.querySelector('[data-dsht-overlay="paused"]') !== null;
    if (livePanel !== null) {
      const pausedBefore = isPaused();
      livePanel.dispatchEvent(
        new KeyboardEvent("keydown", { key: "p", bubbles: true }),
      );
      await wait(150);
      result.keyToggleWorked = isPaused() !== pausedBefore;
      // Leave the game running for the hard-drop scenario below.
      if (isPaused()) {
        livePanel.dispatchEvent(
          new KeyboardEvent("keydown", { key: "p", bubbles: true }),
        );
        await wait(150);
      }
      result.keyRunningAfterToggle = isPaused() === false;
    }

    // ---- Part E: restarting a finished game must resume the simulation ----
    // The bug: reset() stopped the loop and never restarted it, so after
    // "play again" nothing fell and there was no shadow piece.
    let over = false;
    if (livePanel !== null) {
      // Hard-drop the stack up until the game ends. React can only re-render
      // between macrotasks, so the overlay is checked after yielding rather
      // than inside this loop.
      for (let i = 0; i < 300; i += 1) {
        livePanel.dispatchEvent(
          new KeyboardEvent("keydown", { key: " ", bubbles: true }),
        );
      }
      await wait(250);
      over = container.querySelector('[data-dsht-overlay="over"]') !== null;
    }
    result.reachedGameOver = over;

    if (over) {
      const playAgain = container.querySelector('[data-dsht-action="play-again"]');
      if (playAgain !== null) {
        playAgain.click();
        await wait(300);
      }
      result.playAgainClearedOverlay =
        container.querySelector('[data-dsht-overlay="over"]') === null;
      const board = container.querySelector("canvas.dsht_board");
      const sampleBoard = () =>
        Array.from(
          board.getContext("2d").getImageData(0, 0, board.width, board.height).data,
        ).join("");
      const boardBefore = sampleBoard();
      const clockBefore = container.querySelector(".dsht_stats").textContent;
      await wait(900);
      result.boardChangedAfterRestart = sampleBoard() !== boardBefore;
      result.clockChangedAfterRestart =
        container.querySelector(".dsht_stats").textContent !== clockBefore;
    }

    // ---- Part F: focus binding can be switched off ----
    // Still on the idle instance, which is showing its game page.
    const linkButton = idleContainer.querySelector(
      '[data-dsht-action="focus-binding"]',
    );
    result.linkBeforeToggle = linkButton?.getAttribute("data-dsht-focus-binding");
    const errorsBeforeToggle = window.__errors.length;
    // A press on the slider must reach the label, NOT start a header drag.
    // The drag handler used to accept any non-<button> target, so it took
    // pointer capture here and the label never received its activation click.
    // Move the pointer while pressed and check the panel did not move.
    const panelEl = idleContainer.querySelector(".dsht_panel");
    const headerEl = idleContainer.querySelector(".dsht_header");
    const track = idleContainer.querySelector(".dsht_switchTrack");
    if (panelEl !== null && headerEl !== null && track !== null) {
      const leftBefore = panelEl.getBoundingClientRect().left;
      const topBefore = panelEl.getBoundingClientRect().top;
      track.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, isPrimary: true, clientX: 10, clientY: 10 }),
      );
      headerEl.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, pointerId: 1, isPrimary: true, clientX: 90, clientY: 70 }),
      );
      headerEl.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId: 1, isPrimary: true, clientX: 90, clientY: 70 }),
      );
      await wait(120);
      const box = panelEl.getBoundingClientRect();
      result.dragFromSwitch =
        Math.abs(box.left - leftBefore) > 1 || Math.abs(box.top - topBefore) > 1;
      // Now the actual click a browser would synthesise for that press.
      track.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await wait(200);
    }
    result.errorsFromToggle = window.__errors.length - errorsBeforeToggle;
    result.linkAfterToggle = idleContainer
      .querySelector('[data-dsht-action="focus-binding"]')
      ?.getAttribute("data-dsht-focus-binding");
    result.linkCheckedAfter = idleContainer
      .querySelector('[data-dsht-action="focus-binding"]')
      ?.checked;
    result.switchCaptionAfter = (
      idleContainer.querySelector(".dsht_switchText")?.textContent || ""
    ).trim();
    idleContainer.querySelector('[class~="dsht_chip"]');

    result.linkPersisted = (() => {
      try {
        return window.localStorage.getItem("dsh-plugin-tetris.focus-binding");
      } catch {
        return "unavailable";
      }
    })();

    // Close, then let the agent start: an unbound game must stay closed.
    idleContainer.querySelector('[data-dsht-action="close"]')?.click();
    await wait(150);
    status = RUNNING;
    idleRoot.render(React.createElement(captured.component, { useSessionStatus }));
    await wait(300);
    result.unboundAutoOpen = idleContainer.querySelector(".dsht_panel") !== null;

    // Open it by hand and start a game, then let the agent finish: an unbound
    // game must not pause.
    idleContainer.querySelector(".dsht_chip")?.click();
    await wait(200);
    idleContainer.querySelector('[data-dsht-mode="endless"]')?.click();
    await wait(250);
    // Give focus back to the page first, so the measurement is "did the
    // conversation move focus", not "was focus already inside".
    idleContainer.querySelector(".dsht_panel")?.blur();
    await wait(150);
    status = IDLE;
    idleRoot.render(React.createElement(captured.component, { useSessionStatus }));
    await wait(400);
    const unboundPanel = idleContainer.querySelector(".dsht_panel");
    result.unboundStoleFocus =
      unboundPanel !== null &&
      (document.activeElement === unboundPanel ||
        unboundPanel.contains(document.activeElement));

    // ---- Part G: focus binding while it IS on (main instance) ----
    const gamePanel = container.querySelector(".dsht_panel");
    if (gamePanel !== null) {
      gamePanel.focus();
      await wait(150);
      result.panelCanFocus =
        document.activeElement === gamePanel || gamePanel.contains(document.activeElement);

      // Losing focus must pause the game.
      gamePanel.blur();
      await wait(200);
      result.blurPaused =
        container.querySelector('[data-dsht-overlay="paused"]') !== null;

      // A new conversation must not yank an open panel to the menu.
      status = RUNNING;
      reactRoot.render(React.createElement(captured.component, { useSessionStatus }));
      await wait(250);
      result.startKeptGameScreen = container.querySelector("canvas.dsht_board") !== null;

      // The conversation ending hands focus back and resumes the blur pause.
      status = IDLE;
      reactRoot.render(React.createElement(captured.component, { useSessionStatus }));
      await wait(400);
      result.stopRegainedFocus =
        document.activeElement === gamePanel ||
        gamePanel.contains(document.activeElement);
      result.stopResumedBlurPause =
        container.querySelector('[data-dsht-overlay="paused"]') === null;
    }

    result.errors = window.__errors.slice();
    result.ok = true;
  } catch (error) {
    result.failure = String((error && error.stack) || error);
    result.errors = window.__errors.slice();
  }
  document.getElementById("result").textContent = JSON.stringify(result);
})();
</script>
</body>
</html>
`;

  writeFileSync(harnessPath, html, "utf8");

  chromeOutput = execFileSync(
    chromePath,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      // A realistic desktop viewport: the panel is ~612px tall and must fit.
      "--window-size=1200,900",
      `--user-data-dir=${profileDir}`,
      "--virtual-time-budget=30000",
      "--dump-dom",
      `file://${harnessPath}`,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
});

after(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Extract the JSON the page wrote into #result. */
function harnessResult() {
  const match = /<pre id="result">([\s\S]*?)<\/pre>/.exec(chromeOutput);
  assert.ok(match !== null, "harness wrote no #result element");
  const text = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  assert.notEqual(text, "pending", "harness did not finish within the virtual time budget");
  const parsed = JSON.parse(text);
  assert.equal(
    parsed.failure,
    undefined,
    `harness threw in the browser:\n${parsed.failure}`,
  );
  assert.equal(parsed.ok, true, "harness did not report success");
  return parsed;
}

test("the bundle loads and registers in a real browser", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();

  assert.equal(result.registrationCount, 1, "exactly one loader registration");
  assert.equal(result.registrationId, "dsh-plugin-tetris");
  assert.equal(result.hasApply, true);
  assert.deepEqual(result.requested, ["react", "react/jsx-runtime"]);
  assert.deepEqual(result.inject, ["slots"]);
  assert.deepEqual(result.definition, { name: "shell.overlay", id: "tetris", order: 50 });
  assert.ok(result.styleTags >= 1, "the stylesheet must be injected into the document");
});

test("the panel mounts and paints onto a real canvas", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();

  assert.equal(result.panelPresent, true, "the panel did not mount");
  assert.equal(result.canvasCount, 7, "expected board + hold + five next canvases");
  // 10 x 22 by 20 x 22 logical pixels, scaled by devicePixelRatio (1 here).
  assert.deepEqual(result.boardPixels, [220, 440]);
  assert.ok(
    result.paintedPixels > 1000,
    `the board canvas looks blank (${result.paintedPixels} painted pixels)`,
  );
  assert.equal(
    result.centerChildren,
    1,
    "during play the playfield must contain only the board canvas",
  );
  assert.equal(
    result.boardOverlays,
    0,
    "nothing may be stacked over the board while playing",
  );
  assert.equal(result.slotCount, 6, "one Hold well plus five Next wells");
  assert.equal(result.slotCanvases, 6, "every well must hold its canvas");
  assert.deepEqual(
    result.slotSizes,
    [String(result.slotSizes[0])],
    "every well must be the same fixed size",
  );
  assert.deepEqual(
    result.columnWidths,
    [result.columnWidths[0], result.columnWidths[0]],
    `Hold and Next columns must be equal width, got ${JSON.stringify(result.columnWidths)}`,
  );
  assert.match(
    result.slotSizes[0],
    /^([0-9.]+)x\1$/,
    `the wells must be square, got ${result.slotSizes[0]}`,
  );
  assert.ok(
    result.nextGaps.every((gap) => gap >= 3),
    `Next wells must be separated by a real gap, got ${JSON.stringify(result.nextGaps)}`,
  );
  assert.equal(result.slotRadius, "8px", "the wells must be rounded");
  assert.notEqual(
    result.slotBackground,
    "rgba(0, 0, 0, 0)",
    "the wells must have a themed fill, not be transparent",
  );
  assert.equal(result.panelOverflow, false, "the wells must not overflow the panel");
  assert.equal(
    result.keyToggleWorked,
    true,
    "a key press must reach the engine (P toggles pause)",
  );
  assert.equal(result.keyRunningAfterToggle, true, "the scenario needs a running game");
  assert.equal(result.headerDraggable, true, "the drag handle must exist");
  // menu, pause/resume, restart, close — the link control is a checkbox
  // slider, and "play again" only exists inside the game-over overlay.
  assert.equal(result.buttons, 4, "expected the four header buttons");
  assert.equal(result.hasStats, true);
  // Square wells cannot be filled on both axes by one shared cell size; the
  // guard here is only that the piece is not microscopic.
  assert.ok(
    result.previewFill > 0.12,
    `preview pieces are barely visible (${(result.previewFill * 100).toFixed(0)}% of the slot)`,
  );
  assert.equal(result.linkState, "1", "the game is bound to the conversation by default");
  assert.equal(result.linkInputType, "checkbox", "the toggle is a real checkbox");
  assert.equal(result.linkChecked, true, "the slider reads as on");
  assert.equal(result.switchCaption, "焦点联动", "the slider must say what it controls");
  assert.equal(
    result.keysClipped,
    false,
    "the key legend is clipped; shorten it or let it wrap",
  );
  // The fixed-timestep loop must be running in the browser, not frozen.
  assert.equal(result.clockMoving, true, `the game clock never advanced (stats text: ${JSON.stringify(result.statsText)})`);
});

test("a refresh while idle still leaves the entry point (chip, no panel)", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.idleHasChip, true, "the chip must survive an idle refresh");
  assert.equal(result.idleHasPanel, false, "the panel stays closed while idle");
});

test("opening from the chip with no game shows the mode menu", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.menuOnFirstOpen, true, "the menu must be the first page");
  assert.equal(result.menuRows, 7, "upstream lists seven sections");
  assert.equal(result.menuActive, "endless", "ENDLESS is preselected");
});

test("the chip is a circular T-tetrimino icon with no text", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.chipRadius, "50%", "the chip must be circular");
  assert.equal(result.chipBox[0], result.chipBox[1], "and round, so width === height");
  assert.equal(result.chipIconCells, 4, "the T tetrimino is drawn as four cells");
  assert.equal(result.chipText, "", "no text on the chip");
});

test("the chip drags freely and stays on screen", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.chipMoved, true, "the chip must follow a drag");
  assert.equal(result.chipDragDidNotOpen, true, "a drag must not open the panel");
  assert.equal(result.chipOnScreen, true, "the chip must stay inside the viewport");
});

test("the panel opens at the chip and is clamped on screen", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.panelOpenedNearChip, true, "the panel opens where the chip is");
  assert.equal(
    result.panelWithinViewport,
    true,
    "the panel must never hang off the viewport",
  );
});

test("the block title renders in a true monospace face", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  const widths = Object.entries(result.titleAdvances);
  assert.ok(widths.length === 5, "the title advance probe did not run");
  const first = widths[0][1];
  for (const [name, width] of widths) {
    assert.ok(
      Math.abs(width - first) <= 0.5,
      `"${name}" advances ${width}px but others advance ${first}px — the title is not monospaced`,
    );
  }
  // A 28-character row must be exactly 28 cells wide.
  assert.ok(
    Math.abs(result.titleLineWidth - first * result.titleCharsPerLine) <= 1,
    `title row is ${result.titleLineWidth}px, expected ${first * result.titleCharsPerLine}px`,
  );
});

test("the menu and the game page are the same size", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.ok(
    typeof result.menuPanelHeight === "number" && result.menuPanelHeight > 0,
    "could not measure the menu panel",
  );
  assert.ok(
    Math.abs(result.menuPanelHeight - result.gamePanelHeight) <= 2,
    `panel resizes between pages: menu ${result.menuPanelHeight}px vs game ${result.gamePanelHeight}px`,
  );
});

test("entering the game from the menu takes the keyboard", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(
    result.focusAfterChoose,
    true,
    "the board must be focused after choosing a mode",
  );
  // ...while an agent-triggered auto-open must leave the composer alone.
  assert.equal(
    result.autoOpenStoleFocus,
    false,
    "auto-open must not steal focus",
  );
});

test("choosing a mode from the menu starts that mode", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.menuClosedAfterChoose, true, "the menu closes on confirm");
  assert.equal(result.boardAfterChoose, true, "the playfield appears");
  assert.equal(result.modeAfterChoose, "TIME ATTACK", "the chosen mode is active");
});

test("closing the panel keeps the chip as the way back in", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.panelAfterChipClick, true, "clicking the chip must open the panel");
  assert.equal(result.panelAfterClose, false, "the close button must close the panel");
  assert.equal(result.chipAfterClose, true, "closing the panel must leave the chip behind");
});


test("restarting a finished game resumes falling", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.reachedGameOver, true, "the harness never reached a game over");
  assert.equal(
    result.playAgainClearedOverlay,
    true,
    '"play again" must clear the game-over overlay',
  );
  assert.equal(
    result.clockChangedAfterRestart,
    true,
    "the clock must advance after restarting (a stopped loop freezes it)",
  );
  assert.equal(
    result.boardChangedAfterRestart,
    true,
    "the board must change after restarting: nothing falls when the loop stays stopped",
  );
});

test("an agent-triggered open starts on the menu, not in play", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.autoOpenOnMenu, true, "the panel opens on the mode menu");
  assert.equal(result.autoOpenBoard, false, "no board until a mode is chosen");
});

test("focus binding: blur pauses, conversation end hands focus back", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.panelCanFocus, true, "the panel must be focusable");
  assert.equal(result.blurPaused, true, "losing focus pauses the game");
  assert.equal(
    result.startKeptGameScreen,
    true,
    "a new conversation must not yank an open panel to the menu",
  );
  assert.equal(
    result.stopRegainedFocus,
    true,
    "the conversation ending hands focus back to the game",
  );
  assert.equal(
    result.stopResumedBlurPause,
    true,
    "focus returning resumes the pause it caused",
  );
});

test("the conversation ending does nothing else", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.panelAfterStop, true, "no auto-collapse to the chip");
  assert.equal(result.pausedAfterStop, false, "no auto-pause when the agent stops");
  assert.equal(result.stopGrabbedFocus, true, "focus is the one reaction");
});

test("turning focus binding off disables both halves", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.equal(result.linkBeforeToggle, "1", "on by default");
  assert.equal(result.linkAfterToggle, "0", "the slider turns it off");
  assert.equal(result.linkCheckedAfter, false, "the slider reads as off");
  assert.equal(result.linkPersisted, "off", "the choice survives a reload");
  assert.equal(
    result.switchCaptionAfter,
    "焦点联动",
    "the caption stays constant: state is the slider's job",
  );
  assert.equal(
    result.unboundAutoOpen,
    true,
    "auto-open is not part of focus binding (it still opens on the menu)",
  );
  assert.equal(
    result.unboundStoleFocus,
    false,
    "with binding off the conversation must not take focus",
  );
});

test("no errors or warnings were raised in the browser", (t) => {
  if (chromePath === undefined) {
    t.skip(skipReason);
    return;
  }
  const result = harnessResult();
  assert.deepEqual(result.errors, [], "the page reported errors");
});
