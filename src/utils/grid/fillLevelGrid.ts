import type LevelManager from "../../managers/LevelManager";
import { GridTileState, type LevelGrid } from "../../types/Grid";
import { mergeDeep } from "../mergeDeep";
import isInsideGrid from "./isInsideGrid";

const DEFAULT_FILL_OBJECTS = { player: false, zombies: false, blocks: false, mapTiles: false };

export type FillObjects = typeof DEFAULT_FILL_OBJECTS;

interface Refs {
  player: LevelManager["player"];
  zombies: LevelManager["zombies"];
  blocks: LevelManager["blocks"];
  mapTiles: never; // TODO: Implement!
}

/** Fills (mutates) `LevelGrid` with preset choices */
export default function fillLevelGrid<K extends keyof FillObjects>(
  levelGrid: LevelGrid,
  fillObjects: Partial<Pick<FillObjects, K>>,
  refsProp: { [P in K]: Refs[P] },
): LevelGrid {
  const fill = mergeDeep({ ...DEFAULT_FILL_OBJECTS }, fillObjects);
  const refs: Partial<Refs> = { ...refsProp };

  if (fill.player && refs.player) {
    const playerGridPos = refs.player._gridPos;
    levelGrid[playerGridPos.x][playerGridPos.y] = {
      state: GridTileState.PLAYER,
      ref: refs.player,
      pos: refs.player._gridPos,
    };
  }

  if (fill.blocks && refs.blocks) {
    for (const block of refs.blocks.values()) {
      levelGrid[block._gridPos.x][block._gridPos.y] = { state: GridTileState.BLOCKED, ref: block, pos: block._gridPos };
    }
  }

  if (fill.zombies && refs.zombies) {
    for (const [_id, zombie] of refs.zombies) {
      if (!isInsideGrid(zombie._gridPos)) continue;
      levelGrid[zombie._gridPos.x][zombie._gridPos.y].state = GridTileState.BLOCKED;
      levelGrid[zombie._gridPos.x][zombie._gridPos.y].ref = zombie;
    }
  }

  if (fill.mapTiles && refs.mapTiles) {
    throw new Error("NOT IMPLEMENTED!"); // TODO: NOT IMPLEMENTED
  }

  return levelGrid;
}
