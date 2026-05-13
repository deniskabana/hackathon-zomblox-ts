import { GameControls } from "../../types/GameControls";
import { type IInputSource, type InputFrame, EMPTY_CONTROL_STATE, type ControlState } from "../types/inputTypes";

export class CompositeInputSource implements IInputSource {
  private _sources: IInputSource[];

  constructor(sources: IInputSource[]) {
    this._sources = sources;
  }

  public add(source: IInputSource): void {
    this._sources.push(source);
  }

  public remove(source: IInputSource): void {
    this._sources = this._sources.filter((s) => s !== source);
  }

  public buildFrame(tick: number, playerId: number): InputFrame {
    const frames = this._sources.map((s) => s.buildFrame(tick, playerId));

    const controls = Object.fromEntries(
      Object.values(GameControls).map((c) => [c, { ...EMPTY_CONTROL_STATE }]),
    ) as Record<GameControls, ControlState>;

    for (const frame of frames) {
      for (const control of Object.values(GameControls)) {
        const src = frame.controls[control];
        const dst = controls[control];
        controls[control] = {
          pressed: dst.pressed || src.pressed,
          held: dst.held || src.held,
          released: dst.released || src.released,
          consumed: dst.consumed || src.consumed,
        };
      }
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

  public destroy(): void {
    this._sources.forEach((s) => s.destroy());
    this._sources = [];
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
