import AssetManager from "../../managers/core/AssetManager";
import DrawManager from "../../managers/core/DrawManager";
import { ZIndex } from "../../types/lib/ZIndex";
import SpriteSheet from "../../utils/classes/SpriteSheet";
import { GRID_CONFIG, type WorldPosition } from "../core/grid.config";

export enum ItemCategory {
  CONSUMABLE = "consumable",
  WEAPON = "weapon",
  CONSTRUCTION = "construction",
  UNLOCKABLE = "unlockable",
}

export interface ShopItem {
  id: number;
  name: string;
  category: ItemCategory;

  basePrice: number;
  priceStrategy: (basePrice: number, purchaseCount: number, waveNumber: number) => number;

  baseStock: number;
  stockRule: (currentStock: number, waveNumber: number) => number;

  renderItem: (
    worldPos: WorldPosition,
    AssetManager: AssetManager,
    DrawManager: DrawManager,
    options?: { alpha?: number; scale?: number; zIndex?: ZIndex },
  ) => void;
}

export const SHOP_ITEMS: Record<number, ShopItem> = {
  0: {
    id: 0,
    name: "Medkit",
    category: ItemCategory.CONSUMABLE,
    basePrice: 15,
    priceStrategy: (basePrice, purchaseCount) => basePrice + basePrice * purchaseCount,
    baseStock: 1,
    stockRule: (currentStock) => currentStock + 1,
    renderItem: ({ x, y }, AssetManager, DrawManager, options) => {
      const alpha = options?.alpha ?? 1;
      const scale = options?.scale ?? 1;
      const zIndex = options?.zIndex ?? ZIndex.INTERACTIVE;
      const size = GRID_CONFIG.TILE_SIZE * scale * 0.5;
      const sprite = AssetManager.getImageAsset("IShopMedkit")!;
      DrawManager.queueDraw(x - size / 2, y - size / 2, sprite, size, size, zIndex, 0, alpha);
    },
  },
  1: {
    id: 1,
    name: "Shotgun",
    category: ItemCategory.WEAPON,
    basePrice: 65,
    priceStrategy: (basePrice) => basePrice,
    baseStock: 1,
    stockRule: (currentStock) => currentStock,
    renderItem: ({ x, y }, AssetManager, DrawManager, options) => {
      const alpha = options?.alpha ?? 1;
      const scale = options?.scale ?? 1;
      const zIndex = options?.zIndex ?? ZIndex.INTERACTIVE;
      const size = GRID_CONFIG.TILE_SIZE * scale;
      const spritesheet = SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12)!;
      DrawManager.queueDrawSprite(x - size / 2, y - size / 2, spritesheet, 3, size, size, zIndex, 0, alpha);
    },
  },
  2: {
    id: 2,
    name: "Submachine",
    category: ItemCategory.WEAPON,
    basePrice: 135,
    priceStrategy: (basePrice) => basePrice,
    baseStock: 1,
    stockRule: (currentStock) => currentStock,
    renderItem: ({ x, y }, AssetManager, DrawManager, options) => {
      const alpha = options?.alpha ?? 1;
      const scale = options?.scale ?? 1;
      const zIndex = options?.zIndex ?? ZIndex.INTERACTIVE;
      const size = GRID_CONFIG.TILE_SIZE * scale;
      const spritesheet = SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12)!;
      DrawManager.queueDrawSprite(x - size / 2, y - size / 2, spritesheet, 7, size, size, zIndex, 0, alpha);
    },
  },
  3: {
    id: 3,
    name: "Unlockable_Lamp_1",
    category: ItemCategory.UNLOCKABLE,
    basePrice: 20,
    priceStrategy: (basePrice) => basePrice,
    baseStock: 1,
    stockRule: (currentStock) => currentStock,
    renderItem: ({ x, y }, AssetManager, DrawManager, options) => {
      const alpha = options?.alpha ?? 1;
      const zIndex = options?.zIndex ?? ZIndex.INTERACTIVE;

      if (zIndex !== ZIndex.UI) return;
      const scale = zIndex === ZIndex.UI ? 0.75 : (options?.scale ?? 1);
      const size = GRID_CONFIG.TILE_SIZE * scale;
      const spritesheet = SpriteSheet.fromGrid(AssetManager.getImageAsset("IUnlockableLamp")!, 32, 128, 2);
      DrawManager.queueDrawSprite(
        x - size / 2 + 12,
        y - size - size / 2 + (zIndex === ZIndex.UI ? 16 : 0),
        spritesheet,
        zIndex === ZIndex.UI ? 1 : 0,
        size * 0.5,
        size * 2,
        zIndex,
        0,
        alpha,
      );
    },
  },
};
