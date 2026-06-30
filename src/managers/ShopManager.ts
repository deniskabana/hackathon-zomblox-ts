import { SHOP_ITEMS } from "../config/game/shop.config";
import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

export default class ShopManager extends AManager {
  private _gameInstance: GameInstance;

  private _state: Map<ItemId, ShopItemState>; // keyed by itemId
  private _history: PurchaseEvent[];
  private _totalSpent: number;

  private _waveNumber: number;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;

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

  public getItemPrice(id: ItemId): number {
    return this._state.get(id)?.currentPrice ?? 0;
  }

  public getItemStock(id: ItemId): number {
    return this._state.get(id)?.currentStock ?? 0;
  }

  public canAfford(id: ItemId): boolean {
    const { LevelManager } = this._gameInstance.MANAGERS;
    const money = LevelManager.getCurrency();
    return this.getItemPrice(id) <= money;
  }

  public purchase(id: ItemId, playerId: number): boolean {
    const { LevelManager, AssetManager } = this._gameInstance.MANAGERS;
    const stateShopItem = this._state.get(id);
    const shopDefinition = SHOP_ITEMS[id];

    if (!shopDefinition) return false;
    if (!stateShopItem) return false;
    if (this.getItemStock(id) < 1) return false;
    if (!this.canAfford(id)) return false;

    stateShopItem.currentStock -= 1;
    stateShopItem.purchaseCount += 1;
    stateShopItem.currentPrice = shopDefinition.priceStrategy(
      shopDefinition.basePrice,
      stateShopItem.purchaseCount,
      this._waveNumber,
    );

    const pricePaid = stateShopItem.currentPrice;
    LevelManager.addCurrency(pricePaid * -1);
    this._totalSpent += pricePaid;

    this._history.push({
      itemId: id,
      playerId: playerId,
      pricePaid,
      waveNumber: 0,
      timestamp: 0,
    });

    AssetManager.playAudioAsset("AFXShopPurchase", "sound");

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
}

type ItemId = number;

interface ShopItemState {
  id: ItemId;
  currentStock: number;
  currentPrice: number;
  purchaseCount: number;
}

interface PurchaseEvent {
  itemId: number;
  playerId: number;
  pricePaid: number;
  waveNumber: number;
  timestamp: number;
}
