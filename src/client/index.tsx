/**
 * Browser half of the Tetris plugin.
 *
 * Contributes exactly one entry to the frame's `shell.overlay` slot. The
 * "is the agent working?" signal comes from the Session standard props
 * (`useSessionStatus`), which every registered component receives — no
 * service injection of our own is required.
 */

import * as React from "react";

import { GameMode } from "../core/enums.ts";
import { TetrisGame } from "./game.ts";
import { installStyles } from "./styles.ts";
import { clampChipPosition, TetrisChip, TetrisPanel } from "./view.tsx";
import type { PanelScreen } from "./view.tsx";

/** Cordis services this plugin needs. */
export const inject: string[] = ["slots"];

/** Persisted flag for the focus binding. */
const FOCUS_BINDING_KEY = "dsh-plugin-tetris.focus-binding";

/** Read the persisted flag; defaults to on. */
function readFocusBinding(): boolean {
  try {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(FOCUS_BINDING_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeFocusBinding(on: boolean): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FOCUS_BINDING_KEY, on ? "on" : "off");
  } catch {
    // Storage may be unavailable (private mode, sandboxed frame): the toggle
    // still works for this page, it just will not be remembered.
  }
}

/**
 * `SessionStatusSnapshot` is a `ReadonlyMap<SessionId, SessionStatus>`.
 *
 * NOTE: the snapshot carries no "currently selected session", and the selected
 * session is owned by the conversation tree rather than by the session
 * controller, so a root-scoped entry cannot read it. "Any session is running"
 * is the deliberate v1 trigger: with parallel subagents that is also the
 * honest reading of "the agent is busy".
 */
function anySessionRunning(
  snapshot: ReadonlyMap<string, { running?: boolean }> | undefined,
): boolean {
  if (snapshot === undefined || snapshot === null) return false;
  for (const status of snapshot.values()) {
    if (status?.running === true) return true;
  }
  return false;
}

export interface TetrisDockProps {
  /** Framework standard prop: Session UI status, keyed by session id. */
  useSessionStatus: (
    selector: (snapshot: ReadonlyMap<string, { running?: boolean }>) => boolean,
  ) => boolean;
}

/** The overlay entry: decides when the game is on screen. */
export function TetrisDock(props: TetrisDockProps): React.ReactElement | null {
  const running = props.useSessionStatus(anySessionRunning);

  const gameRef = React.useRef<TetrisGame | null>(null);
  if (gameRef.current === null) gameRef.current = new TetrisGame(GameMode.ENDLESS);
  const game = gameRef.current;

  // `open` drives the full panel. The chip is the complement of it, so the
  // overlay ALWAYS has an entry point: a page refresh with the agent idle used
  // to render nothing at all, leaving no way back into the game.
  // Focus binding: losing focus pauses the game, and the conversation ending
  // hands focus back. That is the ONLY thing this flag controls.
  const [focusBinding, setFocusBinding] = React.useState<boolean>(readFocusBinding);
  // `open` starts true only when bound; unbound, the player opens it.
  const [open, setOpen] = React.useState(() => focusBinding && running);
  // Focus request counter: incremented for deliberate opens, menu confirms and
  // the end of a conversation; reset to 0 by an agent-triggered open so that
  // one never steals the keyboard from the composer.
  const [focusRequest, setFocusRequest] = React.useState(0);
  // Where the chip sits (null = its default bottom-right seat) and where the
  // panel should open when the chip is clicked.
  const [chipPosition, setChipPosition] = React.useState<{
    left: number;
    top: number;
  } | null>(null);
  const [openAt, setOpenAt] = React.useState<{ left: number; top: number } | null>(
    null,
  );
  const chipRef = React.useRef<HTMLButtonElement | null>(null);
  // The menu is the panel's home page: a fresh open with nothing to resume
  // lands there, while a waiting period goes straight into play.
  // Opening the panel always lands on the menu, so the player picks a mode.
  const [screen, setScreen] = React.useState<PanelScreen>("menu");
  const previousRunning = React.useRef(running);
  const openRef = React.useRef(open);
  openRef.current = open;

  React.useEffect(() => {
    const wasRunning = previousRunning.current;
    previousRunning.current = running;

    if (running && !wasRunning) {
      // A new waiting period. Open on the menu, without taking focus — but if
      // the panel is already open, leave the player where they are instead of
      // yanking them out of a game.
      if (!openRef.current) {
        setScreen("menu");
        setOpenAt(null); // the default seat, not the chip
        setFocusRequest(0);
        setOpen(true);
      }
      return undefined;
    }

    if (!running && wasRunning && focusBinding) {
      // The conversation ended: hand the keyboard back to the game so the
      // player can carry on. Nothing else follows the conversation — no
      // auto-pause, no auto-collapse.
      setFocusRequest((request) => request + 1);
    }
    return undefined;
  }, [running, focusBinding]);

  const openFromChip = (): void => {
    // Open where the icon is; the panel clamps itself to the viewport.
    const box = chipRef.current?.getBoundingClientRect();
    setOpenAt(box === undefined ? null : { left: box.left, top: box.top });
    setScreen("menu");
    setFocusRequest((request) => request + 1);
    setOpen(true);
  };

  // A resized window must not leave the chip off screen either.
  React.useEffect(() => {
    const onResize = (): void => {
      setChipPosition((current) =>
        current === null ? current : clampChipPosition(current),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleFocusBinding = (): void => {
    setFocusBinding((current) => {
      const next = !current;
      writeFocusBinding(next);
      return next;
    });
  };

  const resumeGame = (): void => {
    setScreen("game");
    setFocusRequest((request) => request + 1);
  };

  return (
    <div className="dsht_root">
      {open ? (
        <TetrisPanel
          game={game}
          screen={screen}
          focusRequest={focusRequest}
          openAt={openAt}
          focusBinding={focusBinding}
          onToggleFocusBinding={toggleFocusBinding}
          onResume={resumeGame}
          onMenu={() => setScreen("menu")}
          onChooseMode={(mode) => {
            game.startMode(mode);
            setScreen("game");
            setFocusRequest((request) => request + 1);
          }}
          onClose={() => setOpen(false)}
        />
      ) : (
        <TetrisChip
          position={chipPosition}
          onMove={setChipPosition}
          onOpen={openFromChip}
          buttonRef={chipRef}
        />
      )}
    </div>
  );
}

/**
 * Client plugin body: install the stylesheet and contribute the overlay entry.
 *
 * Styles are (re)installed here rather than at module scope because the HMR
 * controller removes the previous generation's `<style data-plugin>` tags
 * after the old fiber drains and before the new `apply` runs.
 */
export function apply(ctx: {
  slots: {
    inject: (name: string, fn: () => () => void) => void;
    register: (
      definition: { name: string; id: string; order?: number },
      component: unknown,
    ) => () => void;
  };
}): void {
  installStyles();
  ctx.slots.inject("shell.overlay", () =>
    ctx.slots.register({ name: "shell.overlay", id: "tetris", order: 50 }, TetrisDock),
  );
}
