import { type GridPosition, gridToWorld, GRID_CONFIG } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import getVectorDistance from "../../utils/math/getVectorDistance";
import AEntity, { type EntityAnimations, type EntityBuiltInMethods } from "../abstract/AEntity";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  [key: string]: number;
  coinLifetime: number;
}

export default class Coin extends AEntity<undefined, undefined, Timers, EntityAnimations> {
  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    _game = gameInstance;
    const { GameManager, AssetManager } = _game.MANAGERS;
    const gameSettings = GameManager.getSettings().rules.game;
    const size = GRID_CONFIG.TILE_SIZE / 3;
    const fps = 10;
    const timers: Timers = { coinLifetime: Infinity };
    const animationList = [AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset("SCoin")!, 128, 128, 6, fps, true)];
    const animations: EntityAnimations = { fps, animationList, activeAnimations: [0] };

    if (gameSettings.enableRewardAutoCollect) {
      // TODO: enableRewardAutoCollect
    }

    super({
      worldPos: gridToWorld(gridPos),
      health: Infinity,
      entityId,
      size,
      animations,
      timers,
      initialState: undefined,
      instance: undefined,
    });
  }

  public _builtIn: EntityBuiltInMethods = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const currentAnimation = this._animations.animationList[this._animations.activeAnimations?.[0] ?? 0];
      const size = GRID_CONFIG.TILE_SIZE / 3;
      const { x, y } = this._getWorldPosition();

      if (!currentAnimation) return;

      DrawManager.queueDrawSprite(
        x - size / 2,
        y - size / 2,
        currentAnimation,
        currentAnimation.getCurrentFrame(),
        size,
        size,
        ZIndex.ENTITIES,
        0,
      );
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");

      if (shadowSprite) DrawManager.queueDraw(x - size / 2, y - size / 1.75, shadowSprite, size, size, ZIndex.ENTITIES);
    },

    update: (_deltaTime) => {
      const { LevelManager } = _game.MANAGERS;
      const player = LevelManager.player;
      if (!player) return;

      const { x: playerX, y: playerY } = player._getWorldPosition();
      const playerDistance = player
        ? getVectorDistance(
            { x: playerX - GRID_CONFIG.TILE_SIZE / 2, y: playerY - GRID_CONFIG.TILE_SIZE / 2 },
            this._getWorldPosition(),
          )
        : Infinity;
      if (playerDistance < GRID_CONFIG.TILE_SIZE * 0.75) this.handleCollected();

      if (this._timers.coinLifetimeTimer >= 0) this._destructor();
    },

    drawDebug: () => {},

    destructor: () => {
      const { LevelManager } = _game.MANAGERS;
      LevelManager.destroyEntity(this._entityId, EntityType.COLLECTABLE);
    },
  };

  private handleCollected(): void {
    const { AssetManager, LevelManager } = _game.MANAGERS;
    AssetManager.playAudioAsset("AFXCoinCollected", "sound", 0.3);
    LevelManager.addCurrency(1);
    this._destructor();
  }
}
