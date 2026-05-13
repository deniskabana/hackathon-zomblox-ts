import type { AnyEntity } from "../../entities/engine/AEntity";
import type { Vector } from "../lib/Vector";

export enum GridTileState {
  AVAILABLE,
  BLOCKED,
  PLAYER,
}
export type GridTileRef = AnyEntity;

export interface GridTile {
  state: GridTileState;
  ref: GridTileRef | null;
  pos: Vector;
}
export type LevelGrid = GridTile[][];
