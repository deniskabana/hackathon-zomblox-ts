import type GameInstance from "../../GameInstance";
import { GameControls } from "../../types/GameControls";
import {
  DEFAULT_KEY_BINDINGS,
  EMPTY_CONTROL_STATE,
  type IInputSource,
  type KeyBindings,
  type InputFrame,
  type ControlState,
} from "../types/inputTypes";

/** Keys that are prevented in the browser if the game is playing */
const PREVENT_DEFAULT_KEYS = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"]);

type RawKeyState = { isDown: boolean; wasDown: boolean };

export class KeyboardInputSource implements IInputSource {
  private _bindings: KeyBindings;
  private _rawKeys: Map<string, RawKeyState> = new Map();
  private _gameInstance: GameInstance;

  constructor(gameInstance: GameInstance, bindings: KeyBindings = DEFAULT_KEY_BINDINGS) {
    this._gameInstance = gameInstance;
    this._bindings = bindings;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  private _isGameActive(): boolean {
    return this._gameInstance.MANAGERS.GameManager.isPlaying() && !this._isFocusInInput();
  }

  private _isFocusInInput(): boolean {
    const tag = document.activeElement?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this._isGameActive() || e.repeat) return;
    if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
    this._rawKeys.set(e.code, { isDown: true, wasDown: this._rawKeys.get(e.code)?.isDown ?? false });
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (!this._isGameActive()) return;
    this._rawKeys.set(e.code, { isDown: false, wasDown: true });
  };

  public buildFrame(tick: number, playerId: number): InputFrame {
    const controls = Object.fromEntries(
      Object.values(GameControls).map((c) => [c, { ...EMPTY_CONTROL_STATE }]),
    ) as Record<GameControls, ControlState>;

    for (const [keyCode, binding] of Object.entries(this._bindings)) {
      if (!binding) continue;
      const [control, ...requiredModifiers] = binding;
      const raw = this._rawKeys.get(keyCode);
      if (!raw) continue;

      const modifiersMatch = requiredModifiers.every(
        (m) => this._rawKeys.get(`${m}Left`)?.isDown || this._rawKeys.get(`${m}Right`)?.isDown,
      );
      if (!modifiersMatch) continue;

      const current = controls[control];
      controls[control] = {
        pressed: current.pressed || (raw.isDown && !raw.wasDown),
        held: current.held || raw.isDown,
        released: current.released || (!raw.isDown && raw.wasDown),
        consumed: current.consumed,
      };
    }

    for (const [code, state] of this._rawKeys.entries()) {
      if (!state.isDown && state.wasDown) this._rawKeys.delete(code);
      else this._rawKeys.set(code, { isDown: state.isDown, wasDown: state.isDown });
    }

    const direction = deriveDirection(controls);

    return {
      tick,
      playerId,
      controls,
      direction,
      intensity: direction.x !== 0 || direction.y !== 0 ? 1 : 0,
    };
  }

  public getKeyBindings(): KeyBindings {
    return { ...this._bindings };
  }

  public setKeyBindings(bindings: KeyBindings): void {
    this._bindings = bindings;
  }

  public destroy(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this._rawKeys.clear();
  }
}

function deriveDirection(controls: Record<GameControls, ControlState>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (controls[GameControls.MOVE_LEFT].held) x -= 1;
  if (controls[GameControls.MOVE_RIGHT].held) x += 1;
  if (controls[GameControls.MOVE_UP].held) y -= 1;
  if (controls[GameControls.MOVE_DOWN].held) y += 1;
  if (x !== 0 && y !== 0) {
    const mag = Math.hypot(x, y);
    return { x: x / mag, y: y / mag };
  }
  return { x, y };
}
