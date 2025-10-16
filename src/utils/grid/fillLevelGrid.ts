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
    const playerGridPos = refs.player.gridPos;
    levelGrid[playerGridPos.x][playerGridPos.y] = {
      state: GridTileState.PLAYER,
      ref: refs.player,
      pos: refs.player.gridPos,
    };
  }

  if (fill.blocks && refs.blocks) {
    for (const block of refs.blocks.values()) {
      levelGrid[block.gridPos.x][block.gridPos.y] = { state: GridTileState.BLOCKED, ref: block, pos: block.gridPos };
    }
  }

  if (fill.zombies && refs.zombies) {
    for (const [_id, zombie] of refs.zombies) {
      if (!isInsideGrid(zombie.gridPos)) continue;
      levelGrid[zombie.gridPos.x][zombie.gridPos.y].state = GridTileState.BLOCKED;
      levelGrid[zombie.gridPos.x][zombie.gridPos.y].ref = zombie;
    }
  }

  if (fill.mapTiles && refs.mapTiles) {
    throw new Error("NOT IMPLEMENTED!"); // TODO: NOT IMPLEMENTED
  }

  return levelGrid;
}
