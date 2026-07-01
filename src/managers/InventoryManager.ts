import { ItemCategory, SHOP_ITEMS } from "../config/game/shop.config";
import type GameInstance from "../GameInstance";
import assertNever from "../utils/assertNever";
import { AManager } from "./abstract/AManager";
import type { EntityID } from "./engine/EntityManager";
import type { ShopItemId, ShopPurchaseEvent } from "./ShopManager";

interface Inventory {
  weapons: Set<ShopItemId>;
  consumables: Set<ShopItemId>;
  construction: Map<ShopItemId, { quantity: number }>;
  unlockables: Set<ShopItemId>;
}

export default class InventoryManager extends AManager {
  private _gameInstance: GameInstance;
  private _inventoryByPlayer: Map<EntityID, Inventory>;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._gameInstance = gameInstance;

    this._inventoryByPlayer = new Map();
  }

  _init() {}

  _destroy() {
    this._inventoryByPlayer.clear();
  }

  public getItem(entityId: EntityID, shopItemId: ShopItemId) {
    for (const itemId of this.getWeapons(entityId) ?? []) {
      if (shopItemId === itemId) return SHOP_ITEMS[shopItemId];
    }
    for (const itemId of this.getConsumables(entityId) ?? []) {
      if (shopItemId === itemId) return SHOP_ITEMS[shopItemId];
    }
    for (const [itemId] of this.getConstruction(entityId) ?? []) {
      if (shopItemId === itemId) return SHOP_ITEMS[shopItemId];
    }
    for (const itemId of this.getUnlockables(entityId) ?? []) {
      if (shopItemId === itemId) return SHOP_ITEMS[shopItemId];
    }
    return null;
  }

  public createPlayerInventory(entityId: EntityID): void {
    if (this._inventoryByPlayer.has(entityId)) return;
    this._inventoryByPlayer.set(entityId, {
      weapons: new Set(),
      consumables: new Set(),
      construction: new Map(),
      unlockables: new Set(),
    });
  }
  public clearPlayerInventory(entityId: EntityID): void {
    this._inventoryByPlayer.delete(entityId);
    this.createPlayerInventory(entityId);
  }

  public onShopPurchase(event: ShopPurchaseEvent): void {
    const { LevelManager } = this._gameInstance.MANAGERS;
    const inventory = this._inventoryByPlayer.get(event.playerId);
    const item = SHOP_ITEMS[event.itemId];
    if (!item || !inventory) return;

    switch (item.category) {
      case ItemCategory.CONSUMABLE:
        inventory.consumables.add(item.id);
        break;

      case ItemCategory.WEAPON:
        inventory.weapons.add(item.id);
        LevelManager.player?.equipWeapon(item.name);
        break;

      case ItemCategory.CONSTRUCTION:
        if (inventory.construction.has(item.id)) inventory.construction.get(item.id)!.quantity += 1;
        else inventory.construction.set(item.id, { quantity: 1 });
        break;

      case ItemCategory.UNLOCKABLE:
        inventory.unlockables.add(item.id);
        break;

      default:
        assertNever(item.category);
    }
  }

  public getWeapons(entityId: EntityID): Inventory["weapons"] | undefined {
    return this._inventoryByPlayer.get(entityId)?.weapons;
  }
  public getConsumables(entityId: EntityID): Inventory["consumables"] | undefined {
    return this._inventoryByPlayer.get(entityId)?.consumables;
  }
  public getConstruction(entityId: EntityID): Inventory["construction"] | undefined {
    return this._inventoryByPlayer.get(entityId)?.construction;
  }
  public getUnlockables(entityId: EntityID): Inventory["unlockables"] | undefined {
    return this._inventoryByPlayer.get(entityId)?.unlockables;
  }

  public playerOwnsItem(entityId: EntityID, shopItemId: ShopItemId): boolean {
    return null !== this.getItem(entityId, shopItemId);
  }
}
