/**
 * Node half of the Tetris plugin.
 *
 * The browser half in `src/client/` owns every contribution. This entry exists
 * so the package appears as an ordinary Loader row: the client-modules node
 * half scans *enabled Loader entries* for `dsh.client` declarations, so a
 * package with no importable host half would never reach the browser.
 */

/** Loader-visible no-op body; the browser half carries the feature. */
export function apply(): void {}
