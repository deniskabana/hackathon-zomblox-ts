import {
  DEF_ASSETS_AUDIO,
  DEF_ASSETS_IMAGE,
  type AssetAudioName,
  type AssetImageName,
} from "../config/assets";
import { gameInstance } from "../main";
import assertNever from "../utils/assertNever";

export type AssetAudio = HTMLAudioElement;
export type AssetImage = HTMLImageElement;

export default class AssetManager {
  private assetsAudioMap: Map<AssetAudioName, AssetAudio> = new Map();
  private assetsImageMap: Map<AssetImageName, AssetImage> = new Map();

  private isAssetsLoading: boolean = false;
  private isReady: boolean = false;

  public playingAudioTracks: AssetAudioName[] = [];

  constructor() {}

  public async preloadAssets(): Promise<void> {
    this.isAssetsLoading = true;

    const ERRORS: string[] = [];

    const imagePromises: Promise<void>[] = [];
    let imageName: AssetImageName;
    for (imageName in DEF_ASSETS_IMAGE) {
      const promise = new Promise<void>((resolve) => {
        const img = new Image();
        const name = imageName;
        img.onload = () => resolve();
        img.onerror = () => {
          ERRORS.push(`Failed to load image: ${name}`);
          resolve();
        };
        img.src = DEF_ASSETS_IMAGE[name];
        this.assetsImageMap.set(name, img);
      });
      imagePromises.push(promise);
    }

    const audioPromises: Promise<void>[] = [];
    let audioName: AssetAudioName;
    for (audioName in DEF_ASSETS_AUDIO) {
      const promise = new Promise<void>((resolve) => {
        const audio = new Audio();
        const name = audioName;
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => {
          ERRORS.push(`Failed to load audio: ${name}`);
          resolve();
        };
        audio.src = DEF_ASSETS_AUDIO[name];
        audio.load();
        this.assetsAudioMap.set(name, audio);
      });
      audioPromises.push(promise);
    }

    await Promise.allSettled([...imagePromises, ...audioPromises]);
    this.isAssetsLoading = false;
    this.isReady = true;

    if (ERRORS.length) console.error(ERRORS);
  }

  public getAudioAsset(assetName: AssetAudioName): AssetAudio | undefined {
    return this.assetsAudioMap.get(assetName);
  }

  public getImageAsset(assetName: AssetImageName): AssetImage | undefined {
    return this.assetsImageMap.get(assetName);
  }

  public playAudioAsset(
    assetName: AssetAudioName,
    type: "music" | "sound",
    volume: number = 1,
    loop?: boolean,
  ): void {
    const asset = this.getAudioAsset(assetName);
    const audio = type === "music" ? asset : new Audio(asset?.src);
    if (!asset || !audio) return;

    const volumeSettings =
      gameInstance.MANAGERS.GameManager.getSettings().volume;

    switch (type) {
      case "music":
        if (this.playingAudioTracks.includes(assetName)) return;
        audio.volume = volumeSettings.music * volumeSettings.master * volume;
        audio.loop = true;
        break;
      case "sound":
        audio.volume = volumeSettings.effects * volumeSettings.master * volume;
        audio.loop = false;
        break;
      default:
        assertNever(type);
    }

    if (loop !== undefined) audio.loop = loop;

    this.playingAudioTracks.push(assetName);
    audio.onended = () => {
      const index = this.playingAudioTracks.findIndex(
        (name) => name === assetName,
      );
      if (index !== -1) this.playingAudioTracks.splice(index);
    };
    audio.play();
  }

  public getIsReady(): boolean {
    return this.isReady && !this.isAssetsLoading;
  }
}
