import { type WorldPosition, type GridPosition, worldToGrid } from "../config/gameGrid";

export default abstract class AEntity {
  public worldPos: WorldPosition;
  public gridPos: GridPosition;
  public isStaticObject: boolean;

  constructor(worldPos: WorldPosition, isStaticObject?: boolean) {
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
    this.isStaticObject = isStaticObject ?? true;
  }

  public setWorldPosition(worldPos: WorldPosition): void {
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
  }

  public abstract update(_deltaTime: number): void;
  public abstract draw(_deltaTime: number): void;
}
