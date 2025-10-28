import { GRID_CONFIG, gridToWorld, type GridPosition } from "../../config/gameGrid";
import type GameInstance from "../../GameInstance";
import type { AssetImage } from "../../types/Asset";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import ABlock from "../abstract/ABlock";

export default class BlockBarrelFire extends ABlock {
  public health: number;

  private animation: AnimatedSpriteSheet | undefined;
  private fps: number;
  private spriteSize: number;
  private barrelSprite: AssetImage | undefined;

  private lightSourceId: number | undefined;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.blocks;
    this.health = settings.woodStartHealth;

    const fire = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SFire");
    this.fps = 15;
    this.spriteSize = GRID_CONFIG.TILE_SIZE;
    if (fire) this.animation = AnimatedSpriteSheet.fromGrid(fire, 32, 48, 14, this.fps, true);

    const barrel = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockBarrel");
    if (barrel) this.barrelSprite = barrel;

    this.lightSourceId = this.gameInstance.MANAGERS.LightManager.addLightSource(this.worldPos);
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

  public drawMask(): void {}

  public damage(amount: number): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (!settings.enableBlocksDestruction) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, EntityType.BLOCK);
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.5);
    }
  }

  public destroy(): void {
    if (this.lightSourceId) this.gameInstance.MANAGERS.LightManager.removeLightSource(this.lightSourceId);
  }
}
