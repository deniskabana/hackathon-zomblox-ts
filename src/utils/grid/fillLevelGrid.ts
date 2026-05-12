import type AEntity from "../../entities/engine/AEntity";
import type LevelManager from "../../managers/LevelManager";
import { GridTileState, type LevelGrid } from "../../types/Grid";
import { mergeDeep } from "../mergeDeep";
import isInsideGrid from "./isInsideGrid";

const DEFAULT_FILL_OBJECTS = { player: false, zombies: false, blocks: false, mapTiles: false };

export type FillObjects = typeof DEFAULT_FILL_OBJECTS;

interface Refs {
  player: LevelManager["player"];
  zombies: AEntity[];
  blocks: AEntity[];
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
    const playerGridPos = refs.player._getGridPosition();
    const { x, y } = playerGridPos;

    levelGrid[x][y] = {
      state: GridTileState.PLAYER,
      ref: refs.player,
      pos: playerGridPos,
    };
  }

  if (fill.blocks && refs.blocks) {
    for (const block of refs.blocks.values()) {
      const { x, y } = block._getGridPosition();
      levelGrid[x][y] = { state: GridTileState.BLOCKED, ref: block, pos: block._getGridPosition() };
    }
  }

  if (fill.zombies && refs.zombies) {
    for (const zombie of refs.zombies) {
      const { x, y } = zombie._getGridPosition();
      if (!isInsideGrid(zombie._getGridPosition())) continue;
      levelGrid[x][y].state = GridTileState.BLOCKED;
      levelGrid[x][y].ref = zombie;
    }
  }

  if (fill.mapTiles && refs.mapTiles) {
    throw new Error("NOT IMPLEMENTED!"); // TODO: NOT IMPLEMENTED
  }

  return levelGrid;
}
