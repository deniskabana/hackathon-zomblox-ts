import { type WorldPosition, type GridPosition, worldToGrid } from "../../config/gameGrid";
import type GameInstance from "../../GameInstance";

export default abstract class AEntity {
  public gameInstance: GameInstance;
  public worldPos: WorldPosition;
  public gridPos: GridPosition;
  public isStaticObject: boolean;
  public entityId: number;

  public abstract health: number;

  constructor(gameInstance: GameInstance, worldPos: WorldPosition, entityId: number, isStaticObject?: boolean) {
    this.gameInstance = gameInstance;
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
    this.isStaticObject = isStaticObject ?? true;
    this.entityId = entityId;
  }

  public setWorldPosition(worldPos: WorldPosition): void {
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
  }

  public abstract update(_deltaTime: number): void;
  public abstract draw(_deltaTime: number): void;

  public abstract damage(amount: number): void;
}
