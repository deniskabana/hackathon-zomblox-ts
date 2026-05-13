import { GameControls } from "../../types/GameControls";

export type ControlState = {
  pressed: boolean;
  held: boolean;
  released: boolean;
  consumed: boolean;
};

export const EMPTY_CONTROL_STATE: Readonly<ControlState> = {
  pressed: false,
  held: false,
  released: false,
  consumed: false,
};

/**
 * A time-reliable snapshot produced by `IInputSource`, consumed by entities
 */
export type InputFrame = {
  tick: number;
  playerId: number;
  controls: Record<GameControls, ControlState>;
  direction: { x: number; y: number };
  intensity: number;
};

/**
 * Extendable InputSource for any source
 */
export interface IInputSource {
  /** Called once per tick by InputManager. Returns the current frame. */
  buildFrame(tick: number, playerId: number): InputFrame;
  /** Called when InputManager is destroyed or source is swapped. */
  destroy(): void;
}
export type ModifierKeys = "Shift" | "Control" | "Alt";

export type KeyBinding = [GameControls, ...ModifierKeys[]];

export type KeyBindings = Partial<Record<string, KeyBinding>>;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  // Movement
  KeyW: [GameControls.MOVE_UP],
  KeyS: [GameControls.MOVE_DOWN],
  KeyA: [GameControls.MOVE_LEFT],
  KeyD: [GameControls.MOVE_RIGHT],
  ArrowUp: [GameControls.MOVE_UP],
  ArrowDown: [GameControls.MOVE_DOWN],
  ArrowLeft: [GameControls.MOVE_LEFT],
  ArrowRight: [GameControls.MOVE_RIGHT],

  // Actions
  Space: [GameControls.ACTION_SHOOT],
  KeyR: [GameControls.ACTION_RELOAD],
  KeyQ: [GameControls.PLAYER_CHANGE_WEAPON],
  KeyB: [GameControls.PLAYER_BUILD_MENU],

  // Debug
  Backquote: [GameControls.DEBUG_MENU],
  KeyP: [GameControls.DEBUG_SPAWN_ZOMBIE, "Shift"],
  KeyK: [GameControls.DEBUG_KILL_ZOMBIE, "Shift"],

  // Game flow
  Escape: [GameControls.GAME_PAUSE],
} as const;
