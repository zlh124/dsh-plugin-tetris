/**
 * Integration test against the REAL slot registry.
 *
 * The other bundle test drives `apply()` with a hand-written stub, which can
 * only prove the call *shape*. This one wires `apply()` to the actual
 * `SlotCore` shipped by DSH, declares `shell.overlay` the way
 * `dsh-client-ui-layout` declares it, and lets the framework's own validation
 * decide whether the registration is acceptable.
 *
 * It is the closest thing to "the real renderer will accept this plugin" that
 * can be checked without a browser. If the registry package is not installed
 * the suite reports a skip rather than a false pass.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, before } from "node:test";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = resolve(root, "lib/client.js");

/** Candidate locations for the real registry, most specific first. */
const SLOTS_CANDIDATES = [
  process.env.DSH_SLOTS_PATH,
  resolve(
    homedir(),
    ".dsh/profiles/web/node_modules/@deepseek-ai/dsh-client-ui-slots/lib/index.js",
  ),
  resolve(
    homedir(),
    ".dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-slots/lib/index.js",
  ),
  "/opt/nodejs24/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-slots/lib/index.js",
].filter((candidate) => typeof candidate === "string");

const slotsPath = SLOTS_CANDIDATES.find((candidate) => existsSync(candidate));

let SlotCore;
let registration;
const skipReason = `slot registry not found; looked in:\n  ${SLOTS_CANDIDATES.join("\n  ")}`;

/** Materialize the built client bundle against a fake loader. */
function loadRegistration() {
  const code = readFileSync(clientPath, "utf8");
  let loaded;
  new Function("window", code)({
    __ModuleLoader__: {
      load(value) {
        loaded = value;
      },
    },
  });
  return loaded;
}

/** The platform-table stand-in the factory consumes at materialization. */
const requireShim = (specifier) => {
  assert.ok(
    ["react", "react/jsx-runtime"].includes(specifier),
    `unexpected module request "${specifier}"`,
  );
  return { jsx: () => null, jsxs: () => null, Fragment: null };
};

before(async () => {
  assert.ok(existsSync(clientPath), `missing ${clientPath} — run \`npm run build\` first`);
  registration = loadRegistration();
  if (slotsPath === undefined) return;
  const mod = await import(pathToFileURL(slotsPath).href);
  SlotCore = mod.SlotCore;
});

/**
 * A fresh registry with `shell.overlay` declared exactly as
 * `dsh-client-ui-layout` declares it (a child of its AppFrame registration
 * into the built-in `root` slot).
 *
 * `root` is a `single` slot, so every test needs its own registry instance.
 */
function freshRegistryWithOverlay() {
  const core = new SlotCore();
  const disposeParent = core.register(
    {
      name: "root",
      id: "app-frame",
      children: { "shell.overlay": { kind: "list", scope: "root" } },
    },
    function AppFrame() {},
  );
  return { core, disposeParent };
}

/** Drive `apply()` against a real registry. */
function applyTo(core) {
  const exports = registration.factory(requireShim);
  const disposers = [];
  exports.apply({
    slots: {
      // The renderer's `inject` defers until the slot is declared; in these
      // tests the parent is registered first, so running the factory
      // immediately is the faithful reduction.
      inject(name, factory) {
        assert.equal(name, "shell.overlay");
        disposers.push(factory());
      },
      register(definition, component) {
        return core.register(definition, component);
      },
    },
  });
  return { exports, disposers };
}

test("the real registry is present and declares a bare root slot", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const core = new SlotCore();
  assert.deepEqual(core.spec("root"), { kind: "single", scope: "root" });
  // An undeclared slot has no spec, which is what makes `register` reject.
  assert.equal(core.spec("shell.overlay"), undefined);
});

test("the real registry rejects a registration into an undeclared slot", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const core = new SlotCore();
  // Guards the meaningfulness of the next test: if this did NOT throw, an
  // "accepted" result below would prove nothing.
  assert.throws(
    () => core.register({ name: "shell.overlay", id: "tetris", order: 50 }, () => null),
    /is not declared/,
  );
});

test("apply() is accepted by the real registry after the overlay is declared", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const { core, disposeParent } = freshRegistryWithOverlay();
  try {
    assert.deepEqual(core.spec("shell.overlay"), { kind: "list", scope: "root" });

    let exports;
    assert.doesNotThrow(() => {
      exports = applyTo(core).exports;
    }, "the real registry rejected our entry");

    const winners = core.entriesOfSlot("shell.overlay");
    assert.equal(winners.length, 1, "exactly one overlay entry should win");
    const entry = winners[0];
    // NOTE: the real entry carries only {key,id,order,label,priority}; the
    // slot name is implied by which slot holds it, so it is not asserted here.
    assert.equal(entry.options.id, "tetris");
    assert.equal(entry.options.order, 50);
    assert.equal(entry.component, exports.TetrisDock, "the entry must carry our component");
  } finally {
    disposeParent();
  }
});

test("the entry is a list cell keyed by id, so it never shadows other overlays", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const { core, disposeParent } = freshRegistryWithOverlay();
  try {
    // Another plugin's overlay entry, registered first.
    core.register({ name: "shell.overlay", id: "someone-elses-toast" }, () => null);

    applyTo(core);

    const ids = core
      .entriesOfSlot("shell.overlay")
      .map((entry) => entry.options.id)
      .sort();
    assert.deepEqual(
      ids,
      ["someone-elses-toast", "tetris"],
      "both overlays must coexist; a list slot holds one cell per id",
    );
  } finally {
    disposeParent();
  }
});

test("a duplicate id at the same priority is rejected (no silent shadowing)", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const { core, disposeParent } = freshRegistryWithOverlay();
  try {
    applyTo(core);
    // Registering our id twice must be a loud error, not a silent replace —
    // this is what makes an HMR reload rely on the disposer really running.
    assert.throws(
      () => applyTo(core),
      /already has an entry with id "tetris"/,
    );
  } finally {
    disposeParent();
  }
});

test("registration is cleanly disposable", (t) => {
  if (SlotCore === undefined) {
    t.skip(skipReason);
    return;
  }
  const { core, disposeParent } = freshRegistryWithOverlay();
  try {
    const { disposers } = applyTo(core);
    assert.equal(core.entriesOfSlot("shell.overlay").length, 1);

    for (const dispose of disposers) dispose();
    assert.equal(
      core.entriesOfSlot("shell.overlay").length,
      0,
      "disposing must leave no entry behind (HMR reloads rely on this)",
    );

    // After cleanup the id is free again, so a reload can re-register.
    assert.doesNotThrow(() => applyTo(core));
  } finally {
    disposeParent();
  }
});
