import { GRID_CONFIG } from "../config/core/grid.config";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../types/lib/ZIndex";
import lerp from "../utils/math/lerp";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  private _gameInstance: GameInstance;
  private isShopUiVisible: boolean;
  private shopAlpha: number;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;
    this.isShopUiVisible = true;
    this.shopAlpha = 0;
  }

  public _init(): void {}

  public draw(_fps: number, _deltaTime: number): void {
    const { AssetManager, DrawManager, CameraManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();
    const width = (146 * 2) / zoom;
    const height = (84 * 2) / zoom;

    this.shopAlpha = lerp(this.shopAlpha, this.isShopUiVisible ? 1 : 0, _deltaTime * 20);

    if (this.shopAlpha === 0) return;

    // Background
    DrawManager.queueDraw(
      CameraManager.x - 8 / zoom - width + CameraManager.getTargetWorldWidth() / zoom / 2,
      CameraManager.y + 16 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2,
      AssetManager.getImageAsset("UIControlPanelBg")!,
      width,
      height,
      ZIndex.UI,
      0,
      this.shopAlpha,
    );

    // Big button
    DrawManager.queueDraw(
      CameraManager.x - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 16 / zoom,
      CameraManager.y - 42 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2 + height - 15 / zoom,
      AssetManager.getImageAsset("UIControlPanelBtnBig")!,
      (122 * 2) / zoom,
      (28 * 2) / zoom,
      ZIndex.UI,
      0,
      this.shopAlpha,
    );
    // Button text
    DrawManager.drawText(
      "Purchase [E]",
      CameraManager.x - 8 / zoom - width / 2 + CameraManager.getTargetWorldWidth() / zoom / 2,
      CameraManager.y - 23 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2 + height,
      "#ffffff",
      21 / zoom,
      "Courier",
      "center",
      this.shopAlpha,
      true,
    );

    // Draw shop item
    // DrawManager.queueDrawSprite(
    //   CameraManager.x - 16 / zoom - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 32 / zoom,
    //   CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 36 / zoom,
    //   SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12),
    //   3,
    //   GRID_CONFIG.TILE_SIZE * 1.5,
    //   GRID_CONFIG.TILE_SIZE * 1.5,
    //   ZIndex.UI,
    // );
    DrawManager.queueDraw(
      CameraManager.x - 16 / zoom - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 32 / zoom,
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 28 / zoom,
      AssetManager.getImageAsset("IShopMedkit")!,
      GRID_CONFIG.TILE_SIZE * 1.5,
      GRID_CONFIG.TILE_SIZE * 1.5,
      ZIndex.UI,
      0,
      this.shopAlpha,
    );

    // Coin
    DrawManager.queueDraw(
      CameraManager.x - 32 / zoom + CameraManager.getTargetWorldWidth() / zoom / 2 - 24 / zoom,
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 78 / zoom - 24 / zoom,
      AssetManager.getImageAsset("ICoinSingle")!,
      28 / zoom,
      28 / zoom,
      ZIndex.UI,
      0,
      this.shopAlpha,
    );
    // Price
    DrawManager.drawText(
      "25",
      CameraManager.x - 32 / zoom + CameraManager.getTargetWorldWidth() / zoom / 2 - 30 / zoom,
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 80 / zoom,
      "#ffffff",
      38 / zoom,
      "Courier",
      "right",
      this.shopAlpha,
      true,
    );
  }

  public _destroy(): void {}

  public showShopUI(): void {
    this.isShopUiVisible = true;
  }
  public hideShopUI(): void {
    this.isShopUiVisible = false;
  }

  public showGameOverScreen(): void {}

  public hideGameOverScreen(): void {}
}
