/**
 * Build script for the Tetris plugin.
 *
 * Produces the two artifacts DSH expects:
 *
 *   lib/index.js   — the host half: an ordinary ESM Cordis plugin.
 *   lib/client.js  — the browser half: a lazy-CJS factory registration wrapped
 *                    in the `window.__ModuleLoader__.load({ id, factory })`
 *                    envelope that the web shell's module table consumes.
 *
 * The shared Client tsdown preset the shipped packages use is not published,
 * so the envelope is applied here directly. Everything the browser half may
 * `require` is the shell's frozen platform table; nothing else is external,
 * which is why the game logic is bundled into `lib/client.js`.
 *
 * Usage: node build.mjs [--watch]
 */

import { build } from "esbuild";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const PKG_NAME = pkg.name;

/**
 * The shell's frozen `PLATFORM_MODULES` seed (read out of
 * `@deepseek-ai/dsh-web-frontend`'s built index bundle). These resolve without
 * any `dsh.client.external` declaration; everything else must be bundled in.
 */
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

const COMMON = {
  bundle: true,
  platform: "browser",
  target: "es2022",
  format: "cjs",
  jsx: "automatic",
  external: PLATFORM_MODULES,
  legalComments: "none",
  logLevel: "warning",
  sourcemap: false,
};

/**
 * Write a file atomically (temp file + rename).
 *
 * The running host stats and reads `lib/client.js` while it polls for rebuilds.
 * Writing in place exposes a window where the file exists but is truncated,
 * which has been observed to leave the host's per-package metadata cache
 * holding a bad result (that cache never invalidates before a restart). A
 * rename is atomic, so the host only ever sees a complete artifact.
 */
async function writeAtomic(path, contents) {
  const temp = `${path}.tmp-${process.pid}`;
  await writeFile(temp, contents, "utf8");
  await rename(temp, path);
}

/** Indent every line so the CJS body sits inside the factory closure. */
function indent(text, pad = "\t\t") {
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}

/** Wrap a CJS bundle in the module-loader envelope. */
function wrapClientBundle(body) {
  return `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(PKG_NAME)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
${indent(body)}
\t\treturn module.exports;
\t}
});
`;
}

async function buildHost() {
  await build({
    entryPoints: [resolve(root, "src/index.ts")],
    outfile: resolve(root, "lib/index.js"),
    bundle: true,
    platform: "neutral",
    target: "es2022",
    format: "esm",
    external: ["@deepseek-ai/cordis"],
    legalComments: "none",
    logLevel: "warning",
  });
}

/** Bundle the browser half and write the wrapped artifact. */
async function buildClient() {
  const result = await build({
    ...COMMON,
    entryPoints: [resolve(root, "src/client/index.tsx")],
    write: false,
  });
  const body = result.outputFiles[0].text;
  const outfile = resolve(root, "lib/client.js");
  await mkdir(dirname(outfile), { recursive: true });
  await writeAtomic(outfile, wrapClientBundle(body));
  const kib = (Buffer.byteLength(body, "utf8") / 1024).toFixed(1);
  console.log(`lib/client.js  (${kib} KiB before envelope)`);
}

async function main() {
  const watch = process.argv.includes("--watch");
  await mkdir(resolve(root, "lib"), { recursive: true });

  if (!watch) {
    await Promise.all([buildHost(), buildClient()]);
    return;
  }

  // Watch mode keeps the two artifacts fresh on disk; the running dsh web
  // server stat-polls each row's lib/client.js (~500 ms) and hot-swaps the
  // plugin into the open page without a refresh.
  await buildHost();
  await buildClient();

  let timer = null;
  let building = false;
  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (building) return;
      building = true;
      try {
        await buildClient();
        console.log(`[watch] rebuilt lib/client.js at ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        console.error("[watch] build failed:", error.message);
      } finally {
        building = false;
      }
    }, 60);
  };

  watch_tree(resolve(root, "src"), schedule);
  console.log("[watch] watching src/ — rebuilds lib/client.js on change");
}

/** Recursively watch a directory tree, invoking `onChange` on any edit. */
function watch_tree(dir, onChange) {
  watch(dir, { recursive: true }, (_event, filename) => {
    if (filename === null || filename.endsWith(".ts") || filename.endsWith(".tsx")) {
      onChange();
    }
  });
}

await main();
