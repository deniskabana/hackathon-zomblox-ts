import { SHOP_ITEMS } from "../config/game/shop.config";
import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

export default class ShopManager extends AManager {
  private _gameInstance: GameInstance;

  private onPurchaseCallback: VoidFunction | null;

  private _state: Map<ShopItemId, ShopItemState>; // keyed by itemId
  private _history: ShopPurchaseEvent[];
  private _totalSpent: number;

  private _waveNumber: number;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;

    this.onPurchaseCallback = null;
    this._state = new Map();
    this._history = [];
    this._totalSpent = 0;
    this._waveNumber = 1;
  }

  _init() {
    this._state = new Map();
    this._history = [];
    this._totalSpent = 0;
    this._waveNumber = 1;

    for (const shopItem of Object.values(SHOP_ITEMS)) {
      this._state.set(shopItem.id, {
        id: shopItem.id,
        currentStock: shopItem.baseStock,
        currentPrice: shopItem.basePrice,
        purchaseCount: 0,
      });
    }
  }

  _destroy() {}

  public getItemPrice(id: ShopItemId): number {
    return this._state.get(id)?.currentPrice ?? 0;
  }

  public getItemStock(id: ShopItemId): number {
    return this._state.get(id)?.currentStock ?? 0;
  }

  public canAfford(id: ShopItemId): boolean {
    const { LevelManager } = this._gameInstance.MANAGERS;
    const money = LevelManager.getCurrency();
    return this.getItemPrice(id) <= money;
  }

  public purchase(id: ShopItemId, playerId: number): boolean {
    const { LevelManager, AssetManager, InventoryManager } = this._gameInstance.MANAGERS;
    const stateShopItem = this._state.get(id);
    const shopDefinition = SHOP_ITEMS[id];

    if (!shopDefinition) return false;
    if (!stateShopItem) return false;
    if (this.getItemStock(id) < 1) return false;
    if (!this.canAfford(id)) return false;

    const pricePaid = stateShopItem.currentPrice;

    stateShopItem.currentStock -= 1;
    stateShopItem.purchaseCount += 1;
    stateShopItem.currentPrice = shopDefinition.priceStrategy(
      shopDefinition.basePrice,
      stateShopItem.purchaseCount,
      this._waveNumber,
      stateShopItem.currentPrice,
    );

    LevelManager.addCurrency(pricePaid * -1);
    this._totalSpent += pricePaid;

    const event: ShopPurchaseEvent = {
      itemId: id,
      playerId: playerId,
      pricePaid,
      waveNumber: 0,
      timestamp: 0,
    };
    this._history.push(event);
    InventoryManager.onShopPurchase(event);
    AssetManager.playAudioAsset("AFXShopPurchase", "sound");

    this.onPurchaseCallback?.();

    return true;
  }

  public onWaveStart(waveNumber: number): void {
    this._waveNumber = waveNumber;

    for (const item of this._state.values()) {
      const shopDefinition = SHOP_ITEMS[item.id];
      if (!shopDefinition) continue;
      item.currentStock = shopDefinition.stockRule(item.currentStock, waveNumber);
    }
  }

  public setOnPurchaseCallback(callback: typeof this.onPurchaseCallback): void {
    this.onPurchaseCallback = callback;
  }

  public getStatTotalSpent(): number {
    return this._totalSpent;
  }

  public getPurchaseCount(itemId: ShopItemId): number {
    return this._state.get(itemId)?.purchaseCount ?? 0; // Medkit
  }
}

export type ShopItemId = number;

interface ShopItemState {
  id: ShopItemId;
  currentStock: number;
  currentPrice: number;
  purchaseCount: number;
}

export interface ShopPurchaseEvent {
  itemId: number;
  playerId: number;
  pricePaid: number;
  waveNumber: number;
  timestamp: number;
}
