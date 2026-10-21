/**
 * Panel styles.
 *
 * Injected as a single `<style data-plugin-css=...>` tag, the same contract
 * the shipped client bundles use, so the module system can remove it on
 * teardown. `shell.overlay` is click-through, so the panel and the chip opt
 * back into pointer events explicitly.
 */

const CSS = `
.dsht_root {
  position: absolute;
  inset: 0;
  z-index: 30;
  /* The overlay layer is click-through; only the panel/chip opt back in. */
  pointer-events: none;
  font-family: var(--dsw-font-sans, ui-sans-serif, system-ui, sans-serif);
  font-size: 12px;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  user-select: none;
}
/* Default seat: bottom-right, lifted clear of the composer. Dragging pins
   explicit left/top and clears the default anchors. */
.dsht_panel {
  position: absolute;
  right: 20px;
  bottom: 104px;
  pointer-events: auto;
  /* Board 220 + gaps 20 + two 120px columns + padding 20. */
  width: 500px;
  border-radius: 12px;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.14));
  background: var(--dsw-specific-menu, rgba(28,28,32,0.96));
  box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(0,0,0,0.45));
  backdrop-filter: blur(12px);
  overflow: hidden;
  /* Recessed-well tokens. DSH's fill/border aliases are translucent and are
     re-pointed per theme, so the Hold/Next slots follow the active theme
     without hardcoding a colour. */
  --dsht-slot-bg: var(--dsw-alias-fill-l2, rgba(255,255,255,0.07));
  --dsht-slot-border: var(--dsw-alias-border-l1, rgba(255,255,255,0.12));
}
.dsht_header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: grab;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12));
}
.dsht_header:active { cursor: grabbing; }
.dsht_title { font-weight: 600; letter-spacing: 0.02em; }
.dsht_mode {
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.08));
}
.dsht_spacer { flex: 1; }
.dsht_btn {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #b8b8c0);
  cursor: pointer;
  border-radius: 6px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  font-size: 12px;
  line-height: 1;
}
.dsht_btn:hover {
  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.1));
  color: var(--dsw-alias-label-primary, #fff);
}
.dsht_body { display: flex; align-items: flex-start; gap: 10px; padding: 10px; }
.dsht_leftCol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 120px;
}
.dsht_rightCol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 120px;
}
/* The Hold/Next wells, mirroring the board's recessed treatment. Sizes come
   from the renderer's constants (applied inline) so CSS cannot drift from the
   canvas geometry. */
.dsht_slot {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 8px;
  background: var(--dsht-slot-bg);
  border: 0.5px solid var(--dsht-slot-border);
}
/* The Next column: five equally-sized wells with a real gap between them, so
   consecutive previews never read as one clump. */
.dsht_nextList {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsht_slotLabel {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
}
.dsht_center {
  position: relative;
  border-radius: 8px;
  transition: box-shadow 0.12s ease;
}
/* Focus is signalled by a ring around the playfield. It used to be an overlay
   inside the board, which covered exactly the rows you need to watch. */
.dsht_centerFocused {
  box-shadow: 0 0 0 2px var(--dsw-alias-state-success-primary, #46d07f);
}
.dsht_canvas { display: block; border-radius: 8px; }
.dsht_stats {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
  padding: 0 10px 8px;
  /* Fixed so the menu can match the game page's height exactly. */
  height: 46px;
}
.dsht_stat { display: flex; justify-content: space-between; gap: 6px; }
.dsht_statKey { color: var(--dsw-alias-label-tertiary, #9a9aa2); }
.dsht_statVal { font-variant-numeric: tabular-nums; font-weight: 600; }
.dsht_footer {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px 8px;
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
  font-size: 11px;
}
/* ── lock-down notice popup ───────────────────────────────────────────────
   Each tier reads differently: size, weight and colour all vary, so a Tetris
   or a T-Spin lands visually while a single stays quiet. */
.dsht_noticeBox {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.dsht_notice {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 8px;
  border-radius: 10px;
  border: 0.5px solid var(--dsht-slot-border);
  background: var(--dsht-slot-bg);
  text-align: center;
  line-height: 1.15;
  animation: dsht_pop 170ms cubic-bezier(0.2, 1.4, 0.4, 1);
}
.dsht_noticeLabel { display: block; }
.dsht_noticeSingle { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-secondary, #b8b8c0); }
.dsht_noticeDouble { font-size: 13px; font-weight: 600; color: #4b9bff; }
.dsht_noticeTriple { font-size: 15px; font-weight: 700; color: var(--dsw-alias-state-warning-primary, #f5a623); }
.dsht_noticeTetris { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; color: var(--dsw-alias-state-success-primary, #46d07f); }
.dsht_noticeTspin { font-size: 17px; font-weight: 800; letter-spacing: 0.01em; color: #a86bff; }
.dsht_noticeMini { font-size: 13px; font-weight: 700; color: #a86bff; }
.dsht_noticeGarbage { font-size: 13px; font-weight: 700; color: var(--dsw-alias-state-error-primary, #ff6b6b); }
.dsht_noticeB2b {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, currentColor 22%, transparent);
  color: inherit;
}
/* ── conversation-binding slider ────────────────────────────────────────── */
.dsht_switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 4px;
  border-radius: 7px;
  cursor: pointer;
  user-select: none;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
}
.dsht_switch:hover { background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.08)); }
/* The checkbox itself is the interactive control and the test hook, but it is
   visually replaced by the track + thumb below. */
.dsht_switchInput {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.dsht_switchTrack {
  position: relative;
  flex: none;
  width: 26px;
  height: 15px;
  border-radius: 999px;
  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.18));
  transition: background 0.14s ease;
}
.dsht_switchThumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.14s cubic-bezier(0.3, 1.4, 0.5, 1);
}
/* Constant feature caption (state lives in the track/thumb only). */
.dsht_switchText {
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
  transition: color 0.14s ease;
}
.dsht_switchOn .dsht_switchText {
  color: var(--dsw-alias-label-secondary, #b8b8c0);
}
.dsht_switchOn .dsht_switchTrack {
  background: var(--dsw-alias-state-success-primary, #46d07f);
}
.dsht_switchOn .dsht_switchThumb { transform: translateX(11px); }
.dsht_switchInput:focus-visible + .dsht_switchTrack {
  box-shadow: 0 0 0 2px var(--dsw-alias-state-success-primary, #46d07f);
}

/* ── mode menu (upstream's ui/menu.py screen) ───────────────────────────── */
.dsht_menu {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 18px 14px;
  outline: none;
  /* Exactly as tall as the game page: playfield + body padding + the fixed
     stats/footer/keys strip. Switching pages must not resize the panel. */
  height: calc(var(--dsht-board-h, 440px) + 20px + var(--dsht-chrome-h, 114px));
}
/* The block title is a fixed glyph grid: it only lines up if EVERY character
   (box-drawing included) advances by exactly one cell. The theme's mono family
   resolves to a CJK face here, and CJK fonts commonly draw U+2500..257F at
   full width, which shifts each row by a cell. Pin a Latin monospace that
   covers box-drawing at half width instead. */
.dsht_menuTitle {
  margin: 0;
  font-family: "DejaVu Sans Mono", "Liberation Mono", "Noto Sans Mono",
    ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: 0;
  font-variant-ligatures: none;
  font-feature-settings: normal;
  color: var(--dsw-alias-label-primary, #e8e8ea);
  text-align: left;
  white-space: pre;
}
.dsht_menuList {
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* The rows spread over the full height, which is also what makes the menu
     read like the terminal list rather than a tight stack. */
  justify-content: space-evenly;
  gap: 2px;
  width: 100%;
}
.dsht_menuItem {
  appearance: none;
  border: 0.5px solid transparent;
  background: transparent;
  border-radius: 8px;
  padding: 9px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--dsw-alias-label-secondary, #b8b8c0);
  text-align: center;
}
.dsht_menuItem:hover {
  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.07));
}
.dsht_menuItemActive {
  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.12));
  border-color: var(--dsht-slot-border);
  color: var(--dsw-alias-label-primary, #fff);
}
.dsht_menuItemDisabled { opacity: 0.45; cursor: not-allowed; }
.dsht_menuDesc {
  min-height: 18px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #9a9aa2);
  text-align: center;
}
.dsht_menuHint {
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #8f8f97);
  text-align: center;
}
@keyframes dsht_pop {
  from { transform: scale(0.86); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.dsht_keys {
  box-sizing: border-box;
  height: 34px;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.35;
  color: var(--dsw-alias-label-tertiary, #8f8f97);
  padding: 0 10px 6px;
}
.dsht_keysRow { white-space: nowrap; }
.dsht_kbd {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.16));
  background: var(--dsw-alias-fill-l2, rgba(255,255,255,0.06));
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 10px;
}
.dsht_overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  background: rgba(12,12,14,0.86);
  backdrop-filter: blur(3px);
  text-align: center;
  padding: 12px;
}
.dsht_overlayTitle { font-size: 15px; font-weight: 700; }
.dsht_overlayScore { font-variant-numeric: tabular-nums; font-size: 13px; }
.dsht_overlayHint { color: var(--dsw-alias-label-tertiary, #9a9aa2); font-size: 11px; }
.dsht_primary {
  appearance: none;
  border: 0;
  border-radius: 7px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #0b0b0d;
  background: var(--dsw-alias-state-success-primary, #46d07f);
}
.dsht_focusHintInline {
  color: var(--dsw-alias-state-warning-primary, #f5a623);
}
.dsht_chip {
  position: absolute;
  right: 20px;
  bottom: 20px;
  pointer-events: auto;
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 0.5px solid var(--dsht-slot-border);
  background: var(--dsw-specific-menu, rgba(28,28,32,0.94));
  box-shadow: var(--dsw-elevation-prominent, 0 6px 18px rgba(0,0,0,0.4));
  cursor: grab;
  /* The chip is dragged with pointer events, so the browser must not claim
     the gesture for scrolling. */
  touch-action: none;
  transition: transform 0.12s ease, background 0.12s ease;
}
.dsht_chip:hover {
  background: var(--dsw-alias-fill-l1, rgba(255,255,255,0.12));
  transform: scale(1.06);
}
.dsht_chip:active { cursor: grabbing; }
.dsht_chipPinned { right: auto; bottom: auto; }
.dsht_chip svg { display: block; pointer-events: none; }
50% { opacity: 0.25 } }
`;

const TAG_ID = "dsh-plugin-tetris/styles.css";

/** Inject the stylesheet once; safe to call on every bundle materialization. */
export function installStyles(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-plugin-tetris";
  tag.dataset.pluginCss = TAG_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}
