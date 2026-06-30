import { GRID_CONFIG } from "../config/core/grid.config";
import type { ShopItem } from "../config/game/shop.config";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../types/lib/ZIndex";
import lerp from "../utils/math/lerp";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  private _gameInstance: GameInstance;
  // Shop
  private isShopUiVisible: boolean;
  private shopAlpha: number;
  private activeShopItem: ShopItem | null = null;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;
    this.isShopUiVisible = false;
    this.shopAlpha = 0;
  }

  public _init(): void {}

  public draw(_fps: number, _deltaTime: number): void {
    const { AssetManager, DrawManager, CameraManager, ShopManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();
    const width = (146 * 2) / zoom;
    const height = (84 * 2) / zoom;

    this.shopAlpha = lerp(this.shopAlpha, this.isShopUiVisible ? 1 : 0, _deltaTime * 20);

    if (this.shopAlpha === 0 || !this.activeShopItem) return;

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

    // Big button - positive
    DrawManager.queueDraw(
      CameraManager.x - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 16 / zoom,
      CameraManager.y - 42 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2 + height - 15 / zoom,
      ShopManager.canAfford(this.activeShopItem.id)
        ? AssetManager.getImageAsset("UIControlPanelBtnBig")!
        : AssetManager.getImageAsset("UIControlPanelBtnBigDisabled")!,
      (122 * 2) / zoom,
      (28 * 2) / zoom,
      ZIndex.UI,
      0,
      this.shopAlpha,
    );

    // Button text
    DrawManager.drawText(
      ShopManager.canAfford(this.activeShopItem.id) ? "Purchase [E]" : "Not enough money",
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
    this.activeShopItem?.renderItem(
      {
        x:
          CameraManager.x -
          16 / zoom -
          width +
          CameraManager.getTargetWorldWidth() / zoom / 2 +
          44 / zoom +
          GRID_CONFIG.TILE_SIZE / zoom / 2,
        y:
          CameraManager.y -
          CameraManager.getTargetWorldHeight() / zoom / 2 +
          40 / zoom +
          GRID_CONFIG.TILE_SIZE / zoom / 2,
      },
      AssetManager,
      DrawManager,
      { alpha: this.shopAlpha, scale: 2.25 },
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
      String(this.activeShopItem ? ShopManager.getItemPrice(this.activeShopItem.id) : "?"),
      CameraManager.x - 32 / zoom + CameraManager.getTargetWorldWidth() / zoom / 2 - 30 / zoom,
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 80 / zoom,
      "#ffffff",
      38 / zoom,
      "Courier",
      "right",
      this.shopAlpha,
      true,
    );

    // Stock
    DrawManager.drawText(
      `${ShopManager.getItemStock(this.activeShopItem.id)}x`,
      CameraManager.x -
        16 / zoom -
        width +
        CameraManager.getTargetWorldWidth() / zoom / 2 +
        70 / zoom +
        GRID_CONFIG.TILE_SIZE / zoom,
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 70 / zoom + GRID_CONFIG.TILE_SIZE / zoom / 2,
      "#ffffff",
      26 / zoom,
      "Courier",
      "right",
      this.shopAlpha,
      true,
    );
  }

  public _destroy(): void {}

  public showShopUI(shopItem: ShopItem): void {
    this.activeShopItem = shopItem;
    this.isShopUiVisible = true;
  }
  public hideShopUI(): void {
    this.isShopUiVisible = false;
  }

  public getShopUiItem(): ShopItem | null {
    if (!this.isShopUiVisible) return null;
    return this.activeShopItem;
  }

  public showGameOverScreen(): void {}

  public hideGameOverScreen(): void {}
}
