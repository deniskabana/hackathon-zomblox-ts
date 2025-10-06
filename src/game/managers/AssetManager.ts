import type { GameInstance } from "../../main";

export default class AssetManager {
  instance: GameInstance;
  assetsMap: Map<string, unknown>;

  constructor(instance: GameInstance) {
    this.instance = instance;
    this.assetsMap = new Map();
  }

  public loadAsset(assetUrl: string): void {
    this.assetsMap.set(assetUrl, undefined);
  }
}
