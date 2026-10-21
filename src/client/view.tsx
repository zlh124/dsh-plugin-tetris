/**
 * The floating Tetris panel.
 *
 * Registered into the frame's `shell.overlay` slot, so it lives above every
 * column and outside their scroll containers. The player must click the panel
 * before the keyboard controls engage: auto-focusing would steal keystrokes
 * from the composer the moment the agent starts working.
 */

import * as React from "react";

import { GameMode } from "../core/enums.ts";
import { actionForKey, TetrisGame } from "./game.ts";
import {
  indexOfMode,
  MENU_HINT,
  MENU_SECTIONS,
  MENU_TITLE_ART,
  menuActionForKey,
  stepSelection,
} from "./menu.ts";
import type { MenuSection } from "./menu.ts";
import {
  classifyNotice,
  isDisplayableNotice,
  tierClass,
} from "./notice.ts";
import {
  boardSize,
  drawBoard,
  drawPreview,
  SLOT_SIZE,
} from "./render.ts";
import { installStyles } from "./styles.ts";

/** How many upcoming pieces the Next column shows. */
const NEXT_COUNT = 5;

/** Square preview wells; one shared size for Hold and every Next slot. */
const SLOT_STYLE: React.CSSProperties = {
  width: SLOT_SIZE,
  height: SLOT_SIZE,
};

/** Which screen the panel is showing. */
export type PanelScreen = "menu" | "game";

export interface TetrisPanelProps {
  game: TetrisGame;
  /** Menu (mode selection, upstream's `ui/menu.py`) or the game itself. */
  screen: PanelScreen;
  /** Leave the game screen for the menu. */
  onMenu: () => void;
  /** Start the mode chosen in the menu. */
  onChooseMode: (mode: GameMode) => void;
  /** Return to the paused game instead of starting a new one. */
  onResume: () => void;
  /**
   * Focus request counter. Incremented for a deliberate open, a menu confirm,
   * and (when focus binding is on) the end of a conversation. `0` means "do
   * not take focus", which is what an agent-triggered auto-open uses.
   */
  focusRequest: number;
  /**
   * Where the panel should open, in viewport coordinates (the chip's corner),
   * or null to use its default seat. The panel clamps this to the viewport
   * once it has measured itself.
   */
  openAt: { left: number; top: number } | null;
  /**
   * Focus binding: losing focus pauses the game, and the conversation ending
   * hands focus back. Nothing else follows the conversation.
   */
  focusBinding: boolean;
  /** Flip the focus binding. */
  onToggleFocusBinding: () => void;
  /**
   * Close the panel. The overlay's chip stays behind, so this is only a
   * "step aside", never a way to lose the game or the entry point.
   */
  onClose: () => void;
}

/** One `key: value` row in the stats grid. */
function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="dsht_stat">
      <span className="dsht_statKey">{label}</span>
      <span className="dsht_statVal">{value}</span>
    </div>
  );
}

export function TetrisPanel({
  game,
  screen,
  onMenu,
  onChooseMode,
  onResume,
  focusRequest,
  openAt,
  focusBinding,
  onToggleFocusBinding,
  onClose,
}: TetrisPanelProps): React.ReactElement {
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);
  const boardRef = React.useRef<HTMLCanvasElement | null>(null);
  const holdRef = React.useRef<HTMLCanvasElement | null>(null);
  // One canvas per next slot, in order.
  const nextRefs = React.useRef<Array<HTMLCanvasElement | null>>([]);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = React.useState(false);
  // `null` keeps the default bottom-right seat; dragging pins explicit coords.
  const [pinned, setPinned] = React.useState<{ left: number; top: number } | null>(
    null,
  );

  /** Keep a rect fully on screen, with an 8px margin. */
  const clampToViewport = React.useCallback(
    (left: number, top: number, width: number, height: number) => ({
      left: Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - 8)),
      top: Math.min(Math.max(8, top), Math.max(8, window.innerHeight - height - 8)),
    }),
    [],
  );

  // Open at the chip, then clamp: the panel must never hang off the edge.
  React.useLayoutEffect(() => {
    if (openAt === null) return;
    const panel = panelRef.current;
    if (panel === null) return;
    setPinned(
      clampToViewport(openAt.left, openAt.top, panel.offsetWidth, panel.offsetHeight),
    );
  }, [openAt, clampToViewport]);

  // A resized window must not push the panel outside either.
  React.useEffect(() => {
    const onResize = (): void => {
      const panel = panelRef.current;
      if (panel === null) return;
      setPinned((current) =>
        current === null
          ? current
          : clampToViewport(current.left, current.top, panel.offsetWidth, panel.offsetHeight),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);
  const drag = React.useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  React.useEffect(() => installStyles(), []);

  // `pausedByBlur` remembers that the pause was OUR doing, so grabbing focus
  // can resume it without overriding a pause the player asked for.
  const pausedByBlur = React.useRef(false);

  React.useEffect(() => {
    if (focusRequest === 0) return;
    if (screen !== "game") return;
    panelRef.current?.focus();
    if (pausedByBlur.current) {
      pausedByBlur.current = false;
      game.setPaused(false);
    }
  }, [screen, focusRequest, game]);

  // Re-render whenever the controller reports a change (every animation frame
  // while running, plus discrete input results).
  React.useEffect(() => game.subscribe(() => forceRender()), [game]);

  // Drive the simulation only while the game screen is up: the menu is not a
  // pause, it is a different page, and nothing should be falling behind it.
  React.useEffect(() => {
    if (screen !== "game") return undefined;
    game.start();
    return () => game.stop();
  }, [game, screen]);

  // Repaint the canvases after every render.
  React.useEffect(() => {
    if (boardRef.current !== null) drawBoard(boardRef.current, game.core);
    if (holdRef.current !== null) {
      // Dim the held piece once the hold has been spent this cycle.
      drawPreview(
        holdRef.current,
        game.core.hold?.shape ?? null,
        game.core.holdOnce ? 0.35 : 1,
      );
    }
    const upcoming = game.nextShapes(NEXT_COUNT);
    nextRefs.current.forEach((canvas, index) => {
      if (canvas !== null) drawPreview(canvas, upcoming[index] ?? null);
    });
  });

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const action = actionForKey(event.key);
    if (action === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    game.dispatch(action);
  };

  /** Drag the panel by its header, clamped so it can never leave the viewport. */
  const onHeaderPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    // Let interactive header children handle their own clicks. This used to
    // list only "button", so the switch's <label>/<input> started a drag
    // instead: the header took pointer capture, the label never received its
    // activation click, and the slider could not be toggled.
    if ((event.target as HTMLElement).closest("button, label, input, a") !== null) {
      return;
    }
    const panel = panelRef.current;
    if (panel === null) return;
    const rect = panel.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHeaderPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    if (state === null || state.pointerId !== event.pointerId) return;
    const panel = panelRef.current;
    setPinned(
      clampToViewport(
        event.clientX - state.offsetX,
        event.clientY - state.offsetY,
        panel?.offsetWidth ?? 500,
        panel?.offsetHeight ?? 620,
      ),
    );
  };

  const onHeaderPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;
    if (state === null || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const core = game.core;
  const size = boardSize(core);
  const outcome = game.outcome;
  const rawNotice = core.getNotice();
  const notice = isDisplayableNotice(rawNotice)
    ? classifyNotice(rawNotice)
    : null;

  return (
    <div
      ref={panelRef}
      className="dsht_panel"
      tabIndex={0}
      onKeyDown={screen === "game" ? onKeyDown : undefined}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        setFocused(false);
        if (!focusBinding) return;
        // Ignore focus moving between elements *inside* the panel (header
        // buttons, the canvas, the slider).
        const next = event.relatedTarget as Node | null;
        if (next !== null && panelRef.current?.contains(next) === true) return;
        if (game.outcome !== null || game.core.paused) return;
        pausedByBlur.current = true;
        game.setPaused(true);
      }}
      style={
        {
          outline: "none",
          // The menu sizes itself from the playfield so both pages are the
          // same height; the board is the only variable part of the layout.
          "--dsht-board-h": `${size.height}px`,
          ...(pinned === null
            ? {}
            : { left: pinned.left, top: pinned.top, right: "auto", bottom: "auto" }),
        } as React.CSSProperties
      }
    >
      <div
        className="dsht_header"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <span className="dsht_title">俄罗斯方块</span>
        <span className="dsht_mode">{game.modeLabel}</span>
        <span className="dsht_spacer" />
        {/* A real checkbox behind a slider: the previous plain button had no
            on/off styling at all, so there was no way to tell the state. */}
        <label
          className={`dsht_switch${focusBinding ? " dsht_switchOn" : ""}`}
          title={
            focusBinding
              ? "焦点联动已开启：失去焦点自动暂停；对话结束后自动把焦点交还游戏"
              : "焦点联动已关闭：游戏不会因失焦暂停，也不会在对话结束后抢焦点"
          }
        >
          <input
            type="checkbox"
            className="dsht_switchInput"
            checked={focusBinding}
            data-dsht-action="focus-binding"
            data-dsht-focus-binding={focusBinding ? "1" : "0"}
            aria-label={
              focusBinding ? "焦点联动：已开启，点击关闭" : "焦点联动：已关闭，点击开启"
            }
            onChange={onToggleFocusBinding}
          />
          <span className="dsht_switchTrack" aria-hidden="true">
            <span className="dsht_switchThumb" />
          </span>
          {/* Constant caption: it names the feature, never the state — the
              slider is what shows on/off. */}
          <span className="dsht_switchText">焦点联动</span>
        </label>
        {screen === "game" ? (
          <button
            type="button"
            className="dsht_btn"
            data-dsht-action="menu"
            title="回到菜单"
            onClick={onMenu}
          >
            ☰
          </button>
        ) : null}
        {screen === "game" ? (
          <>
            <button
              type="button"
              className="dsht_btn"
              data-dsht-action="pause"
              title={core.paused ? "继续 (P)" : "暂停 (P)"}
              onClick={() => game.dispatch("pause")}
            >
              {core.paused ? "▶" : "❚❚"}
            </button>
            <button
              type="button"
              className="dsht_btn"
              data-dsht-action="restart"
              title="重开一局"
              onClick={() => game.reset()}
            >
              ↻
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="dsht_btn"
          data-dsht-action="close"
          title="收起（右下角胶囊可再打开）"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {screen === "menu" ? (
        <TetrisMenu
          autoFocus={focusRequest > 0}
          defaultMode={game.lastMode}
          canResume={game.started && game.outcome === null}
          resumeScore={game.core.score}
          onResume={onResume}
          onChoose={onChooseMode}
          onQuit={onClose}
        />
      ) : (
        <>
      <div className="dsht_body">
        <div className="dsht_leftCol">
          <span className="dsht_slotLabel">Hold</span>
          <div className="dsht_slot" style={SLOT_STYLE}>
            <canvas ref={holdRef} className="dsht_canvas" />
          </div>
          {/* The lock-down result lives in the blank column beside the board
              rather than in the footer strip the TUI used. */}
          <div className="dsht_noticeBox">
            {notice === null ? null : (
              <div
                className={`dsht_notice dsht_notice${tierClass(notice.tier)}`}
              >
                <span className="dsht_noticeLabel">{notice.label}</span>
                {notice.b2b ? <span className="dsht_noticeB2b">B2B</span> : null}
              </div>
            )}
          </div>
        </div>

        <div className={`dsht_center${focused ? " dsht_centerFocused" : ""}`}>
          <canvas
            ref={boardRef}
            className="dsht_canvas dsht_board"
            style={{ width: size.width, height: size.height }}
          />
          {outcome !== null ? (
            <div className="dsht_overlay" data-dsht-overlay="over">
              <span className="dsht_overlayTitle">游戏结束</span>
              <span className="dsht_overlayScore">得分 {outcome.settlement.score}</span>
              <span className="dsht_overlayHint">
                消行 {outcome.settlement.lines} · 用时 {outcome.settlement.time}
              </span>
              <button
                type="button"
                className="dsht_primary"
                data-dsht-action="play-again"
                onClick={() => game.reset()}
              >
                再来一局
              </button>
            </div>
          ) : null}
          {outcome === null && core.paused ? (
            <div className="dsht_overlay" data-dsht-overlay="paused">
              <span className="dsht_overlayTitle">已暂停</span>
              <span className="dsht_overlayHint">
                {game.isRunning ? "按 P 继续" : "等待 agent 下一步…"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="dsht_rightCol">
          <span className="dsht_slotLabel">Next</span>
          <div className="dsht_nextList">
            {Array.from({ length: NEXT_COUNT }, (_, index) => (
              <div className="dsht_slot" style={SLOT_STYLE} key={index}>
                <canvas
                  className="dsht_canvas"
                  ref={(element) => {
                    nextRefs.current[index] = element;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dsht_stats">
        <Stat label="分数" value={String(core.score)} />
        <Stat label="消行" value={String(core.lines)} />
        <Stat label="等级" value={String(core.level)} />
        <Stat
          label={game.gameMode === GameMode.TIME_ATTACK ? "剩余" : "时间"}
          value={
            game.gameMode === GameMode.TIME_ATTACK
              ? core.timeRemaining
              : core.gameTimeStr
          }
        />
      </div>

      <div className="dsht_footer">
        {outcome === null && !core.paused && !focused ? (
          // The "click to start" affordance lives here rather than floating
          // over the playfield, where it covered the bottom rows.
          <span className="dsht_focusHintInline">点击棋盘后用键盘操作</span>
        ) : (
          <span>等待 agent 时来一局</span>
        )}
      </div>

      {/* Two fixed lines: the legend has to fit inside a fixed-height strip
          (the menu matches it), so it must not wrap unpredictably or clip. */}
      <div className="dsht_keys">
        <div className="dsht_keysRow">
          <span className="dsht_kbd">←</span>{" "}
          <span className="dsht_kbd">→</span> 移动 ·{" "}
          <span className="dsht_kbd">↑</span>/<span className="dsht_kbd">X</span>{" "}
          顺时针 · <span className="dsht_kbd">Z</span> 逆时针
        </div>
        <div className="dsht_keysRow">
          <span className="dsht_kbd">↓</span> 软降 ·{" "}
          <span className="dsht_kbd">空格</span> 硬降 ·{" "}
          <span className="dsht_kbd">C</span> Hold ·{" "}
          <span className="dsht_kbd">P</span> 暂停
        </div>
      </div>
        </>
      )}
    </div>
  );
}

/**
 * The mode-selection screen, laid out like upstream's `ui/menu.py`: the block
 * title, the section list with a highlighted row, and a notice line beneath.
 */
export function TetrisMenu({
  autoFocus,
  defaultMode,
  canResume,
  resumeScore,
  onResume,
  onChoose,
  onQuit,
}: {
  /** Take focus only for a deliberate open (see `TetrisPanelProps`). */
  autoFocus: boolean;
  defaultMode: GameMode;
  /** A paused game exists, so offer to go back to it. */
  canResume: boolean;
  resumeScore: number;
  onResume: () => void;
  onChoose: (mode: GameMode) => void;
  onQuit: () => void;
}): React.ReactElement {
  const initial = indexOfMode(defaultMode);
  const [index, setIndex] = React.useState(initial >= 0 ? initial : 0);
  const [hint, setHint] = React.useState("");
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  // Only a deliberate open may take the keyboard; an agent-triggered auto-open
  // lands on this page too and must leave the composer alone.
  React.useEffect(() => {
    if (autoFocus) menuRef.current?.focus();
  }, [autoFocus]);

  const confirm = (section: MenuSection): void => {
    if (section.disabled === true) {
      setHint(section.description);
      return;
    }
    if (section.mode !== undefined) {
      onChoose(section.mode);
      return;
    }
    onQuit();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const action = menuActionForKey(event.key);
    if (action === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    if (action === "confirm") {
      confirm(MENU_SECTIONS[index]);
      return;
    }
    setIndex((current) => stepSelection(current, action));
    setHint("");
  };

  const selected = MENU_SECTIONS[index];

  return (
    <div
      ref={menuRef}
      className="dsht_menu"
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ outline: "none" }}
    >
      <pre className="dsht_menuTitle">{MENU_TITLE_ART.join("\n")}</pre>

      {/* Opening the panel always lands on this page, so an in-progress game
          needs an explicit way back rather than being silently replaced. */}
      {canResume ? (
        <button
          type="button"
          className="dsht_resume"
          data-dsht-action="resume"
          onClick={onResume}
        >
          继续上次对局 · 得分 {resumeScore}
        </button>
      ) : null}

      <div className="dsht_menuList" role="listbox" aria-label="游戏模式">
        {MENU_SECTIONS.map((section, i) => {
          const active = i === index;
          return (
            <button
              type="button"
              key={section.key}
              role="option"
              aria-selected={active}
              data-dsht-mode={section.key}
              className={[
                "dsht_menuItem",
                active ? "dsht_menuItemActive" : "",
                section.disabled === true ? "dsht_menuItemDisabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => {
                setIndex(i);
                setHint("");
              }}
              onClick={() => {
                setIndex(i);
                confirm(section);
              }}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="dsht_menuDesc">{hint === "" ? selected.description : hint}</div>
      <div className="dsht_menuHint">{MENU_HINT}</div>
    </div>
  );
}

/** Chip diameter in px; also the drag clamp box. */
export const CHIP_SIZE = 44;
const CHIP_MARGIN = 4;

/** Clamp a chip position so the whole circle stays on screen. */
export function clampChipPosition(position: {
  left: number;
  top: number;
}): { left: number; top: number } {
  return {
    left: Math.min(
      Math.max(CHIP_MARGIN, position.left),
      Math.max(CHIP_MARGIN, window.innerWidth - CHIP_SIZE - CHIP_MARGIN),
    ),
    top: Math.min(
      Math.max(CHIP_MARGIN, position.top),
      Math.max(CHIP_MARGIN, window.innerHeight - CHIP_SIZE - CHIP_MARGIN),
    ),
  };
}

/**
 * The persistent entry point: a circular button carrying the classic T
 * tetrimino, which is also the thing you drag around.
 *
 * No text, per design: the shape is the label. It opens the panel where it
 * sits, and it can never be dragged off screen.
 */
export function TetrisChip({
  position,
  onMove,
  onOpen,
  buttonRef,
}: {
  /** Explicit viewport position, or null for the default bottom-right seat. */
  position: { left: number; top: number } | null;
  onMove: (position: { left: number; top: number }) => void;
  onOpen: () => void;
  /** Exposed so the owner can measure it when computing where to open. */
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}): React.ReactElement {
  const drag = React.useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = React.useRef(false);

  const clamp = (left: number, top: number): { left: number; top: number } =>
    clampChipPosition({ left, top });

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - box.left,
      offsetY: event.clientY - box.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an optimisation; a synthetic or already-released pointer
      // must not abort the drag.
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const state = drag.current;
    if (state === null || state.pointerId !== event.pointerId) return;
    if (
      Math.abs(event.clientX - state.startX) + Math.abs(event.clientY - state.startY) > 3
    ) {
      state.moved = true;
    }
    if (!state.moved) return;
    onMove(clamp(event.clientX - state.offsetX, event.clientY - state.offsetY));
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const state = drag.current;
    if (state === null || state.pointerId !== event.pointerId) return;
    // A drag must not also count as "open the panel".
    suppressClick.current = state.moved;
    drag.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Nothing to release.
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`dsht_chip${position === null ? "" : " dsht_chipPinned"}`}
      style={
        position === null
          ? undefined
          : { left: position.left, top: position.top, right: "auto", bottom: "auto" }
      }
      aria-label="打开俄罗斯方块"
      title="俄罗斯方块"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onOpen();
      }}
    >
      {/* The classic T tetrimino: three cells across the bottom, one on top. */}
      <svg viewBox="0 0 58 38" width="26" height="17" aria-hidden="true" focusable="false">
        {[
          [1, 0],
          [0, 1],
          [1, 1],
          [2, 1],
        ].map(([col, row]) => (
          <rect
            key={`${col}-${row}`}
            x={col * 20}
            y={row * 20}
            width={18}
            height={18}
            rx={3}
            fill="#a86bff"
          />
        ))}
      </svg>
    </button>
  );
}
