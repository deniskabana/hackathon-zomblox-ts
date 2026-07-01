import { GRID_CONFIG } from "../config/core/grid.config";
import type { ShopItem } from "../config/game/shop.config";
import type GameInstance from "../GameInstance";
import { FONT_MONO } from "../styles/styles.config";
import type { ScreenPosition } from "../types/engine/ScreenPosition";
import { ZIndex } from "../types/lib/ZIndex";
import lerp from "../utils/math/lerp";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  private _gameInstance: GameInstance;

  // Shop UI
  private isShopUiVisible: boolean;
  private shopAlpha: number;
  private activeShopItem: ShopItem | null;
  // Equip UI
  private isEquipUiVisible: boolean;
  private equipAlpha: number;
  private activeEquipItem: ShopItem | null;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;

    this.isShopUiVisible = false;
    this.shopAlpha = 0;
    this.activeShopItem = null;

    this.isEquipUiVisible = false;
    this.equipAlpha = 0;
    this.activeEquipItem = null;
  }

  public _init(): void {}

  public draw(fps: number, _deltaTime: number): void {
    this.shopAlpha = lerp(this.shopAlpha, this.isShopUiVisible ? 1 : 0, _deltaTime * 17);
    if (this.shopAlpha !== 0) this.drawShopUi();

    this.equipAlpha = lerp(this.equipAlpha, this.isEquipUiVisible ? 1 : 0, _deltaTime * 17);
    if (this.equipAlpha !== 0) this.drawEquipUi();

    this.drawDebug(fps);
    this.drawHealthbars();
  }

  public drawDebug(fps: number) {
    if (!this._gameInstance.isDev) return;

    const { DrawManager, CameraManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();
    const textX = CameraManager.x - CameraManager.getTargetWorldWidth() / 2 / zoom;
    const textY = CameraManager.y + CameraManager.getTargetWorldHeight() / 2 / zoom;

    DrawManager.drawText(`${fps} FPS`, textX - 1, textY - 1, "#fff", 20 / zoom, FONT_MONO, "left", 1, true);
    DrawManager.drawText(`${fps} FPS`, textX + 1, textY + 1, "#fff", 20 / zoom, FONT_MONO, "left", 1, true);
    DrawManager.drawText(`${fps} FPS`, textX + 1, textY - 1, "#fff", 20 / zoom, FONT_MONO, "left", 1, true);
    DrawManager.drawText(`${fps} FPS`, textX - 1, textY + 1, "#fff", 20 / zoom, FONT_MONO, "left", 1, true);
    DrawManager.drawText(`${fps} FPS`, textX, textY, "#aa1c2f", 20 / zoom, FONT_MONO, "left", 1, true);
  }

  public _destroy(): void {}

  private _drawActionUiBg(zoom: number, alpha: number) {
    const { AssetManager, DrawManager, CameraManager } = this._gameInstance.MANAGERS;
    const width = (146 * 2) / zoom;
    const height = (84 * 2) / zoom;

    const bgX = CameraManager.x - 8 / zoom - width + CameraManager.getTargetWorldWidth() / zoom / 2;
    const bgY = CameraManager.y + 16 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2;
    const bgSprite = AssetManager.getImageAsset("UIControlPanelBg")!;

    DrawManager.queueDraw(bgX, bgY, bgSprite, width, height, ZIndex.UI, 0, alpha);

    return { width, height };
  }

  private _drawActionUiBigBtn({
    text,
    disabled = false,
    width,
    height,
    zoom,
    alpha,
  }: {
    text: string;
    disabled?: boolean;
    width: number;
    height: number;
    zoom: number;
    alpha: number;
  }): void {
    const { AssetManager, DrawManager, CameraManager } = this._gameInstance.MANAGERS;

    const btnX = CameraManager.x - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 16 / zoom;
    const btnY = CameraManager.y - 42 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2 + height - 15 / zoom;
    const btnSprite = disabled
      ? AssetManager.getImageAsset("UIControlPanelBtnBigDisabled")!
      : AssetManager.getImageAsset("UIControlPanelBtnBig")!;
    DrawManager.queueDraw(btnX, btnY, btnSprite, (122 * 2) / zoom, (28 * 2) / zoom, ZIndex.UI, 0, alpha);

    const btnTextX = CameraManager.x - 8 / zoom - width / 2 + CameraManager.getTargetWorldWidth() / zoom / 2;
    const btnTextY = CameraManager.y - 23 / zoom - CameraManager.getTargetWorldHeight() / zoom / 2 + height;
    DrawManager.drawText(text, btnTextX, btnTextY, "#ffffff", 23 / zoom, FONT_MONO, "center", alpha, true);
  }

  private _getItemAvatarProps(width: number, size: number, zoom: number): { screenPos: ScreenPosition; scale: number } {
    const { CameraManager } = this._gameInstance.MANAGERS;

    const shopItemX =
      CameraManager.x - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 28 / zoom + size / zoom / 2;
    const shopItemY = CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 40 / zoom + size / zoom / 2;

    return { screenPos: { x: shopItemX, y: shopItemY }, scale: 2.25 / zoom };
  }

  private drawHealthbars(): void {
    const { LevelManager, AssetManager, DrawManager, CameraManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();

    const barSprite = AssetManager.getImageAsset("UIHealthBar")!;
    const barX = CameraManager.x - CameraManager.getTargetWorldWidth() / 2 + 48 / zoom - 6 / zoom;
    const barY = CameraManager.y - CameraManager.getTargetWorldHeight() / 2 + 16 / 2 / zoom;
    DrawManager.queueDraw(barX, barY, barSprite, 144 / zoom, 32 / zoom, ZIndex.UI);

    const signSprite = AssetManager.getImageAsset("UIHealthSign")!;
    const signX = CameraManager.x - CameraManager.getTargetWorldWidth() / 2;
    const signY = CameraManager.y - CameraManager.getTargetWorldHeight() / 2;
    DrawManager.queueDraw(signX, signY, signSprite, 48 / zoom, 48 / zoom, ZIndex.UI);

    if (!LevelManager.player) return;
    const maxHealth = LevelManager.player._getMaxHealth();
    const health = LevelManager.player._getHealth();
    const ratio = health / maxHealth;

    const maxWidth = (144 - 8) / zoom;
    DrawManager.drawRectFilled(
      barX + 8 / zoom,
      barY + 6 / zoom,
      (maxWidth * ratio) / zoom - 6 / zoom,
      (32 - 12) / zoom,
      "#aa1c2f",
    );
  }

  private drawShopUi(): void {
    const { AssetManager, DrawManager, CameraManager, ShopManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();
    const alpha = this.shopAlpha;

    if (!this.activeShopItem) return;

    // Background
    const { width, height } = this._drawActionUiBg(zoom, alpha);

    // Button
    let btnText = "Purchase [E]";
    if (!ShopManager.canAfford(this.activeShopItem.id)) btnText = "Not enough money";
    if (!ShopManager.getItemStock(this.activeShopItem.id)) btnText = "Sold out";

    const btnDisabled =
      !ShopManager.canAfford(this.activeShopItem.id) || ShopManager.getItemStock(this.activeShopItem.id) <= 0;
    this._drawActionUiBigBtn({ text: btnText, width, height, zoom, disabled: btnDisabled, alpha });

    // Coin
    const coinX = CameraManager.x - 32 / zoom + CameraManager.getTargetWorldWidth() / zoom / 2 - 24 / zoom;
    const coinY = CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 78 / zoom - 24 / zoom;
    const coinSprite = AssetManager.getImageAsset("ICoinSingle")!;
    DrawManager.queueDraw(coinX, coinY, coinSprite, 28 / zoom, 28 / zoom, ZIndex.UI, 0, alpha);

    // Price
    const price = String(this.activeShopItem ? ShopManager.getItemPrice(this.activeShopItem.id) : "?");
    const priceX = coinX - 6 / zoom;
    const priceY = coinY + 25 / zoom;
    DrawManager.drawText(price, priceX, priceY, "#fff", 40 / zoom, FONT_MONO, "right", alpha, true);

    // Shop item
    const shopItemSize = GRID_CONFIG.TILE_SIZE;
    const avatarProps = this._getItemAvatarProps(width, shopItemSize, zoom);
    this.activeShopItem?.renderItem(avatarProps.screenPos, AssetManager, DrawManager, {
      alpha,
      scale: avatarProps.scale,
    });

    // Stock amount
    const stock = `${ShopManager.getItemStock(this.activeShopItem.id)}x`;
    const stockX =
      CameraManager.x - width + CameraManager.getTargetWorldWidth() / zoom / 2 + 54 / zoom + shopItemSize / zoom;
    const stockY =
      CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 70 / zoom + shopItemSize / zoom / 2;
    DrawManager.drawText(stock, stockX, stockY, "#fff", 26 / zoom, FONT_MONO, "right", alpha, true);
  }

  private drawEquipUi(): void {
    const { AssetManager, DrawManager, CameraManager, LevelManager } = this._gameInstance.MANAGERS;
    const zoom = CameraManager.getZoomScale();
    const alpha = this.equipAlpha;

    if (!this.activeEquipItem) return;

    const isEquipped = LevelManager.player?.getCurrentWeapon() === this.activeEquipItem.name;

    // Background
    const { width, height } = this._drawActionUiBg(zoom, alpha);

    // Button
    const btnText = isEquipped ? "Already equipped" : "Equip [E]";
    const btnDisabled = isEquipped;
    this._drawActionUiBigBtn({ text: btnText, width, height, zoom, disabled: btnDisabled, alpha });

    // Right text (instead of price)
    const rightText = "Owned";
    const rightTextX = CameraManager.x - 32 / zoom + CameraManager.getTargetWorldWidth() / zoom / 2 + 4 / zoom;
    const rightTextY = CameraManager.y - CameraManager.getTargetWorldHeight() / zoom / 2 + 78 / zoom + 1 / zoom;
    DrawManager.drawText(rightText, rightTextX, rightTextY, "#fff", 40 / zoom, FONT_MONO, "right", alpha, true);

    // Equip item
    const equipItemSize = GRID_CONFIG.TILE_SIZE;
    const avatarProps = this._getItemAvatarProps(width, equipItemSize, zoom);
    this.activeEquipItem?.renderItem(avatarProps.screenPos, AssetManager, DrawManager, {
      alpha,
      scale: avatarProps.scale,
    });
  }

  public showShopUI(shopItem: ShopItem): void {
    this.activeShopItem = shopItem;
    this.isShopUiVisible = true;
    this.isEquipUiVisible = false;
  }
  public hideShopUI(): void {
    this.isShopUiVisible = false;
  }
  public getShopUiItem(): ShopItem | null {
    if (!this.isShopUiVisible) return null;
    return this.activeShopItem;
  }

  public showEquipUI(shopItem: ShopItem): void {
    this.activeEquipItem = shopItem;
    this.isEquipUiVisible = true;

    if (this.isShopUiVisible) {
      this.isShopUiVisible = false;
      this.shopAlpha = 0;
      this.equipAlpha = 1;
    }
  }
  public hideEquipUI(): void {
    this.isEquipUiVisible = false;
  }
  public getEquipUiItem(): ShopItem | null {
    if (!this.isEquipUiVisible) return null;
    return this.activeEquipItem;
  }

  public showGameOverScreen(): void {
    alert("YOU DED");
    window.location.reload();
  }

  public hideGameOverScreen(): void {}
}
