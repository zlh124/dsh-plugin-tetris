/**
 * Contract test for the built browser artifact.
 *
 * `lib/client.js` is not a normal module: it is a `window.__ModuleLoader__.load`
 * registration whose factory is materialized later by the shell's module table.
 * This test stands in for that shell — it evaluates the artifact against a fake
 * loader and a fake `require`, then asserts the plugin registers the shape DSH
 * expects. It catches envelope/bundling regressions that the engine tests
 * cannot see.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test, before } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = resolve(root, "lib/client.js");
const hostPath = resolve(root, "lib/index.js");

/** Module ids the shell's frozen platform table answers. */
const PLATFORM_MODULES = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-store",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-dockkit",
];

let registration;

before(() => {
  assert.ok(
    existsSync(clientPath),
    `missing ${clientPath} — run \`npm run build\` first`,
  );
  const code = readFileSync(clientPath, "utf8");
  const fakeWindow = {
    __ModuleLoader__: {
      load(value) {
        registration = value;
      },
    },
  };
  // Evaluate exactly as a classic <script> would. Only `window` is bound as a
  // parameter; `document` must keep resolving to the ambient global so the
  // style test can install a stand-in before apply() runs.
  new Function("window", code)(fakeWindow);
});

test("registers exactly one module-loader entry", () => {
  assert.ok(registration !== undefined, "no __ModuleLoader__.load call was made");
  assert.equal(registration.id, "dsh-plugin-tetris");
  assert.equal(typeof registration.factory, "function");
});

test("factory only requests modules from the shell's platform table", () => {
  const requested = [];
  const requireShim = (specifier) => {
    requested.push(specifier);
    assert.ok(
      PLATFORM_MODULES.includes(specifier),
      `bundle requested "${specifier}", which is not in the platform table; ` +
        "it must be bundled in or declared under dsh.client.external",
    );
    // A blank stand-in is enough: nothing here touches the APIs at
    // materialization time.
    return {};
  };

  const exports = registration.factory(requireShim);
  assert.ok(requested.length > 0, "factory requested no modules at all");
  assert.deepEqual(
    [...new Set(requested)].sort(),
    ["react", "react/jsx-runtime"],
    "unexpected platform module set",
  );
  assert.equal(typeof exports.apply, "function");
  assert.ok(Array.isArray(exports.inject));
});

test("apply() contributes one shell.overlay entry and installs styles", () => {
  const registrations = [];
  const injections = [];
  let styleTag;

  const previousDocument = globalThis.document;
  globalThis.document = {
    querySelector: () => null,
    createElement: () => {
      styleTag = { dataset: {}, textContent: "" };
      return styleTag;
    },
    head: {
      appendChild: (node) => {
        styleTag = node;
      },
    },
  };

  try {
    const exports = registration.factory((specifier) => ({
      jsx: () => null,
      jsxs: () => null,
      Fragment: null,
    }));
    const ctx = {
      slots: {
        inject(name, factory) {
          injections.push(name);
          factory();
        },
        register(definition, component) {
          registrations.push({ definition, component });
          return () => {};
        },
      },
    };
    exports.apply(ctx);

    assert.deepEqual(injections, ["shell.overlay"]);
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].definition.name, "shell.overlay");
    assert.equal(registrations[0].definition.id, "tetris");
    assert.equal(typeof registrations[0].component, "function");

    assert.ok(styleTag !== undefined, "no <style> tag was injected");
    assert.equal(styleTag.dataset.plugin, "dsh-plugin-tetris");
    assert.ok(
      String(styleTag.textContent).includes(".dsht_panel"),
      "stylesheet content looks wrong",
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("host half is an ESM plugin exposing apply()", async () => {
  assert.ok(existsSync(hostPath), `missing ${hostPath} — run \`npm run build\` first`);
  const mod = await import(hostPath);
  assert.equal(typeof mod.apply, "function");
});

test("package manifest declares the client and bundle contract", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(pkg.dsh.client.platform, "web");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.exports["./client"], "./lib/client.js");
  assert.equal(pkg.main, "lib/index.js");
  assert.ok(
    pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0,
    "runtime dependencies must stay empty: the browser half only sees the platform table",
  );
});
