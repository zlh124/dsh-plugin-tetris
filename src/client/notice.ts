/**
 * Notice classification.
 *
 * The engine reports a lock-down result as one display string built by
 * `_buildNotice` (upstream `core.py`), optionally suffixed with ` B2B!`:
 *
 *   "Single!" "Double!" "Triple!" "Tetris!"
 *   "T-Spin!" "T-Spin Single!" "T-Spin Double!" "T-Spin Triple!"
 *   "T-Spin Mini!" "T-Spin Mini Single!"
 *   "Garbage +N!"   (from `addGarbageLines`)
 *   "PAUSED"        (from `getNotice` while paused)
 *
 * The UI wants each kind to read differently — size, weight and colour — so
 * this maps the string onto a small tier vocabulary. It is deliberately a pure
 * function with no DOM, so the whole mapping is unit-testable.
 */

export type NoticeTier =
  | "single"
  | "double"
  | "triple"
  | "tetris"
  | "tspin"
  | "mini"
  | "garbage";

export interface NoticeStyle {
  /** Tier used for the CSS class. */
  tier: NoticeTier;
  /** The notice text with the B2B suffix stripped. */
  label: string;
  /** Whether a back-to-back bonus was earned. */
  b2b: boolean;
}

/** The suffix `_buildNotice` appends, with the leading space. */
const B2B_SUFFIX = "B2B!";

/** The paused label; the board already shows its own paused overlay. */
export const PAUSED_NOTICE = "PAUSED";

/**
 * Classify a notice string.
 *
 * The order of the checks matters: "T-Spin Mini Single!" must not be read as a
 * plain single, and "T-Spin Double!" must not be read as a plain double.
 */
export function classifyNotice(notice: string): NoticeStyle {
  const trimmed = notice.trim();
  const b2b = trimmed.endsWith(B2B_SUFFIX);
  const label = b2b ? trimmed.slice(0, -B2B_SUFFIX.length).trim() : trimmed;

  let tier: NoticeTier;
  if (label.startsWith("T-Spin Mini")) tier = "mini";
  else if (label.startsWith("T-Spin")) tier = "tspin";
  else if (label.startsWith("Tetris")) tier = "tetris";
  else if (label.startsWith("Triple")) tier = "triple";
  else if (label.startsWith("Double")) tier = "double";
  else if (label.startsWith("Garbage")) tier = "garbage";
  else tier = "single";

  return { tier, label, b2b };
}

/** CSS class suffix for a tier ("tspin" -> "Tspin"). */
export function tierClass(tier: NoticeTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Whether a notice string is worth showing in the popup.
 *
 * `PAUSED` is excluded because the board already renders a paused overlay;
 * showing both would say the same thing twice.
 */
export function isDisplayableNotice(notice: string): boolean {
  return notice !== "" && notice !== PAUSED_NOTICE;
}
