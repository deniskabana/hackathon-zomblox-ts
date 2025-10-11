import type AEntity from "../entities/AEntity";
import type { Vector } from "./Vector";

export enum GridTileState {
  AVAILABLE,
  BLOCKED,
  PLAYER,
}
export type GridTileRef = AEntity; // TODO: Also add static map parts later!

export interface GridTile {
  state: GridTileState;
  ref: GridTileRef | null;
  pos: Vector;
}
export type LevelGrid = GridTile[][];

