import type GameInstance from "../../GameInstance";
import { KeyboardInputSource } from "../../input/sources/KeyboardInputSource";
import {
  type IInputSource,
  type InputFrame,
  type KeyBindings,
  EMPTY_CONTROL_STATE,
} from "../../input/types/inputTypes";
import { GameControls } from "../../types/GameControls";
import { AManager } from "../abstract/AManager";

const LOCAL_PLAYER_ID = 0;

export class InputManager extends AManager {
  private _sources: Map<number, IInputSource> = new Map();
  private _frames: Map<number, InputFrame> = new Map();
  private _tick: number = 0;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public _init(): void {
    this.registerSource(LOCAL_PLAYER_ID, new KeyboardInputSource(this.gameInstance));
  }

  public _destroy(): void {
    for (const source of this._sources.values()) source.destroy();
    this._sources.clear();
    this._frames.clear();
  }

  // Game loop
  // --------------------------------------------------

  public updateBefore(tick: number): void {
    this._tick = tick;
    for (const [playerId, source] of this._sources.entries()) {
      this._frames.set(playerId, source.buildFrame(tick, playerId));
    }
  }

  // Source management
  // --------------------------------------------------

  public registerSource(playerId: number, source: IInputSource): void {
    this._sources.get(playerId)?.destroy();
    this._sources.set(playerId, source);
  }

  public removeSource(playerId: number): void {
    this._sources.get(playerId)?.destroy();
    this._sources.delete(playerId);
    this._frames.delete(playerId);
  }

  public getSource(playerId: number = LOCAL_PLAYER_ID): IInputSource | undefined {
    return this._sources.get(playerId);
  }

  // Key bindings — proxied to KeyboardInputSource
  // --------------------------------------------------

  public setKeyBindings(bindings: KeyBindings, playerId: number = LOCAL_PLAYER_ID): void {
    const source = this._sources.get(playerId);
    if (source instanceof KeyboardInputSource) source.setKeyBindings(bindings);
  }

  public getKeyBindings(playerId: number = LOCAL_PLAYER_ID): KeyBindings | undefined {
    const source = this._sources.get(playerId);
    if (source instanceof KeyboardInputSource) return source.getKeyBindings();
  }

  // Read API — entity facing
  // --------------------------------------------------

  public getFrame(playerId: number = LOCAL_PLAYER_ID): InputFrame {
    return this._frames.get(playerId) ?? this._emptyFrame(playerId);
  }

  public wasPressed(control: GameControls, playerId: number = LOCAL_PLAYER_ID): boolean {
    const state = this._frames.get(playerId)?.controls[control];
    return (state?.pressed && !state.consumed) ?? false;
  }

  public isHeld(control: GameControls, playerId: number = LOCAL_PLAYER_ID): boolean {
    const state = this._frames.get(playerId)?.controls[control];
    return (state?.held && !state.consumed) ?? false;
  }

  public wasReleased(control: GameControls, playerId: number = LOCAL_PLAYER_ID): boolean {
    const state = this._frames.get(playerId)?.controls[control];
    return (state?.released && !state.consumed) ?? false;
  }

  public consumeAction(control: GameControls, playerId: number = LOCAL_PLAYER_ID): void {
    const frame = this._frames.get(playerId);
    if (frame) frame.controls[control].consumed = true;
  }

  // Debug
  // --------------------------------------------------

  public _toDebugSnapshot(): Record<string, unknown> {
    const frames: Record<number, unknown> = {};
    for (const [playerId, frame] of this._frames.entries()) {
      frames[playerId] = {
        tick: frame.tick,
        direction: frame.direction,
        intensity: frame.intensity,
        held: Object.entries(frame.controls)
          .filter(([, s]) => s.held)
          .map(([c]) => c),
      };
    }
    return { tick: this._tick, frames };
  }

  // Private
  // --------------------------------------------------

  private _emptyFrame(playerId: number): InputFrame {
    return {
      tick: this._tick,
      playerId,
      controls: Object.fromEntries(
        Object.values(GameControls).map((c) => [c, { ...EMPTY_CONTROL_STATE }]),
      ) as InputFrame["controls"],
      direction: { x: 0, y: 0 },
      intensity: 0,
    };
  }
}
