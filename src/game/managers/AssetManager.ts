import { DEF_ASSETS_AUDIO, DEF_ASSETS_IMAGE, type AssetAudioName, type AssetImageName } from "../../config/assets";
import type { GameInstance } from "../../main";

export type AssetAudio = HTMLAudioElement
export type AssetImage = HTMLImageElement

export default class AssetManager {
  instance: GameInstance;
  assetsAudioMap: Map<AssetAudioName, AssetAudio>;
  assetsImageMap: Map<AssetImageName, AssetImage>;

  isAssetsLoading: boolean = false;
  isReady: boolean = false;

  constructor(instance: GameInstance) {
    this.instance = instance;
    this.assetsAudioMap = new Map<AssetAudioName, AssetAudio>;
    this.assetsImageMap = new Map<AssetImageName, AssetImage>;

    this.preloadAssets()
  }

  private async preloadAssets(): Promise<void> {
    this.isAssetsLoading = true;

    const ERRORS: string[] = []

    const imagePromises: Promise<void>[] = [];
    let imageName: AssetImageName;
    for (imageName in DEF_ASSETS_IMAGE) {
      const promise = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => {
          ERRORS.push(`Failed to load image: ${imageName}`);
          resolve()
        }
        img.src = DEF_ASSETS_IMAGE[imageName];
        this.assetsImageMap.set(imageName, img);
      });
      imagePromises.push(promise);
    }

    const audioPromises: Promise<void>[] = [];
    let audioName: AssetAudioName;
    for (audioName in DEF_ASSETS_AUDIO) {
      const promise = new Promise<void>((resolve) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => {
          ERRORS.push(`Failed to load audio: ${audioName}`);
          resolve()
        }
        audio.src = DEF_ASSETS_AUDIO[audioName];
        audio.load();
        this.assetsAudioMap.set(audioName, audio);
      });
      audioPromises.push(promise);
    }

    await Promise.all([...imagePromises, ...audioPromises]);
    this.isAssetsLoading = false;
    this.isReady = true;

    if (ERRORS.length) console.error(ERRORS)
  }

  public getAudioAsset(assetName: AssetAudioName): AssetAudio | undefined {
    return this.assetsAudioMap.get(assetName)
  }

  public getImageAsset(assetName: AssetImageName): AssetImage | undefined {
    return this.assetsImageMap.get(assetName)
  }

  public getIsReady(): boolean {
    return this.isReady
  }
}
