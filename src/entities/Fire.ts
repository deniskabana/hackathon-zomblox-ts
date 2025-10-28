import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import type { AssetImage } from "../types/Asset";
import { EntityType } from "../types/EntityType";
import { ZIndex } from "../types/ZIndex";
import { AnimatedSpriteSheet } from "../utils/classes/AnimatedSpriteSheet";
import AEntity from "./abstract/AEntity";

export default class Fire extends AEntity {
  public health: number = -1;
  public entityType = EntityType.COLLECTABLE;

  private animation: AnimatedSpriteSheet | undefined;
  private fps: number;
  private spriteSize: number;
  private barrelSprite: AssetImage | undefined;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    const fire = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SFire");
    this.fps = 15;
    this.spriteSize = GRID_CONFIG.TILE_SIZE;
    if (fire) this.animation = AnimatedSpriteSheet.fromGrid(fire, 32, 48, 14, this.fps, true);

    const barrel = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockBarrel");
    if (barrel) this.barrelSprite = barrel;
  }

  public update(_deltaTime: number): void {
    this.animation?.update(Math.min(_deltaTime, 1 / this.fps));
  }

  public draw(): void {
    if (!this.barrelSprite) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x + (this.spriteSize * 0.25) / 2,
      this.worldPos.y + this.spriteSize * 0.25,
      this.barrelSprite,
      this.spriteSize * 0.75,
      this.spriteSize * 0.75,
      ZIndex.BLOCKS,
    );

    if (!this.animation) return;

    this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this.worldPos.x + this.spriteSize * 0.2,
      this.worldPos.y - this.spriteSize * 0.52,
      this.animation,
      this.animation.getCurrentFrame(),
      (this.spriteSize / 48) * 32,
      this.spriteSize,
      ZIndex.EFFECTS,
      0,
    );
  }

  public damage(): void {}
}
