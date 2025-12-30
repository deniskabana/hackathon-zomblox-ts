export interface GridConfig {
  TILE_SIZE: number;
  GRID_WIDTH: number;
  GRID_HEIGHT: number;
}

export let GRID_CONFIG: GridConfig = {
  TILE_SIZE: 48,
  GRID_WIDTH: 30,
  GRID_HEIGHT: 30,
};

export const WORLD_SIZE = {
  get WIDTH() {
    return GRID_CONFIG.TILE_SIZE * GRID_CONFIG.GRID_WIDTH;
  },
  get HEIGHT() {
    return GRID_CONFIG.TILE_SIZE * GRID_CONFIG.GRID_HEIGHT;
  },
};

export function setGridConfig(config: GridConfig): void {
  GRID_CONFIG = config;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export function gridToWorld(
  gridPos: GridPosition,
  config?: { center?: boolean; gridConfig?: GridConfig },
): WorldPosition {
  const center = config?.center;
  const gridConfig = config?.gridConfig ?? GRID_CONFIG;
  return {
    x: gridPos.x * gridConfig.TILE_SIZE + (center ? gridConfig.TILE_SIZE / 2 : 0),
    y: gridPos.y * gridConfig.TILE_SIZE + (center ? gridConfig.TILE_SIZE / 2 : 0),
  };
}

/** Floors values, since grids are integers */
export function worldToGrid(worldPos: WorldPosition, config?: { gridConfig?: GridConfig }): GridPosition {
  const gridConfig = config?.gridConfig ?? GRID_CONFIG;

  return {
    x: Math.floor(worldPos.x / gridConfig.TILE_SIZE),
    y: Math.floor(worldPos.y / gridConfig.TILE_SIZE),
  };
}

export function isValidGridPos(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_CONFIG.GRID_WIDTH && pos.y >= 0 && pos.y < GRID_CONFIG.GRID_HEIGHT;
}
