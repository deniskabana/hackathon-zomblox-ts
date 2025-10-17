import { DEF_ASSETS_AUDIO, DEF_ASSETS_IMAGE, type AssetAudioName, type AssetImageName } from "../config/assets";
import assertNever from "../utils/assertNever";
import viteConfig from "../../vite.config";
import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";
import type { AudioControl } from "../types/AudioControl";

export type AssetAudio = HTMLAudioElement;
export type AssetImage = HTMLImageElement;

export default class AssetManager extends AManager {
  private assetsAudioMap: Map<AssetAudioName, AssetAudio> = new Map();
  private assetsImageMap: Map<AssetImageName, AssetImage> = new Map();

  private isAssetsLoading: boolean = false;
  private isReady: boolean = false;

  public playingAudioTracks: AssetAudioName[] = [];
  public playingMusic: Map<HTMLAudioElement, number> = new Map();

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {}

  public async preloadAssets(): Promise<void> {
    this.isAssetsLoading = true;

    const ERRORS: string[] = [];

    const base = viteConfig.base.replace(/\/$/, "");

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
        img.src = base + DEF_ASSETS_IMAGE[name];
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
        audio.src = base + DEF_ASSETS_AUDIO[name];
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
    autoplay?: boolean,
  ): AudioControl | undefined {
    const asset = this.getAudioAsset(assetName);
    const audio = type === "music" ? asset : new Audio(asset?.src);
    if (!asset || !audio) return;

    const volumeSettings = this.gameInstance.MANAGERS.GameManager.getSettings().volume;

    switch (type) {
      case "music":
        if (this.playingAudioTracks.includes(assetName)) return;
        audio.loop = true;
        break;

      case "sound":
        audio.volume = volumeSettings.effects * volumeSettings.master * volume;
        audio.loop = false;
        audio.playbackRate = 1 + (Math.random() - 0.25) * 2 * 0.2;
        break;

      default:
        assertNever(type);
    }

    if (loop !== undefined) audio.loop = loop;

    this.playingAudioTracks.push(assetName);
    if (type === "music") this.playingMusic.set(audio, volume);

    audio.onended = () => {
      this.playingMusic.delete(audio);
      const index = this.playingAudioTracks.findIndex((name) => name === assetName);
      if (index !== -1) this.playingAudioTracks.splice(index);
    };

    if (autoplay !== false) audio.play();
    this.updateMusicVolume();

    return {
      pause: () => {
        audio.pause();
      },
      resume: () => {
        audio.play();
        this.updateMusicVolume();
      },
      fadeIn: () => {
        audio.volume = 0;
        audio.play();
        const setNewVolume = () => {
          audio.volume = Math.min(volume, (0.05 + audio.volume) * 1.02);
          if (audio.volume < volume) setTimeout(setNewVolume, 90);
        };
        setNewVolume();
      },
      fadeOut: () => {
        if (audio.paused) return;
        audio.volume = volume;
        const setNewVolume = () => {
          audio.volume = Math.max(0, (audio.volume - 0.05) * 0.98);
          if (audio.volume > 0) setTimeout(setNewVolume, 90);
          else audio.pause();
        };
        setNewVolume();
      },
    };
  }

  public pauseAllMusic(): void {
    for (const [track] of this.playingMusic) track.pause();
  }

  public resumeAllMusic(): void {
    for (const [track] of this.playingMusic) track.play();
    this.updateMusicVolume();
  }

  public updateMusicVolume(): void {
    const volumeSettings = this.gameInstance.MANAGERS.GameManager.getSettings().volume;
    for (const [track, volume] of this.playingMusic)
      track.volume = volumeSettings.music * volumeSettings.master * volume;
  }

  public getIsReady(): boolean {
    return this.isReady && !this.isAssetsLoading;
  }

  public destroy(): void {
    this.assetsAudioMap.clear();
    this.assetsImageMap.clear();
  }
}
