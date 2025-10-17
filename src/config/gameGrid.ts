export const GRID_CONFIG = {
  TILE_SIZE: 48, // px
  GRID_WIDTH: 30,
  GRID_HEIGHT: 20,
};

export type GridConfig = typeof GRID_CONFIG;

export const WORLD_SIZE = {
  WIDTH: GRID_CONFIG.TILE_SIZE * GRID_CONFIG.GRID_WIDTH,
  HEIGHT: GRID_CONFIG.TILE_SIZE * GRID_CONFIG.GRID_HEIGHT,
} as const;

export interface GridPosition {
  x: number;
  y: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export function gridToWorld(gridPos: GridPosition, center?: boolean): WorldPosition {
  return {
    x: gridPos.x * GRID_CONFIG.TILE_SIZE + (center ? GRID_CONFIG.TILE_SIZE / 2 : 0),
    y: gridPos.y * GRID_CONFIG.TILE_SIZE + (center ? GRID_CONFIG.TILE_SIZE / 2 : 0),
  };
}

/** Floors values, since grids are integers */
export function worldToGrid(worldPos: WorldPosition): GridPosition {
  return {
    x: Math.floor(worldPos.x / GRID_CONFIG.TILE_SIZE),
    y: Math.floor(worldPos.y / GRID_CONFIG.TILE_SIZE),
  };
}

export function isValidGridPos(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_CONFIG.GRID_WIDTH && pos.y >= 0 && pos.y < GRID_CONFIG.GRID_HEIGHT;
}
