import { DEFAULT_SETTINGS, KEY_SETTINGS, type GameSettingsSpec } from "../../config/game/settings.config";
import type GameInstance from "../../GameInstance";
import type { DeepPartial } from "../../types/DeepPartial";
import { mergeDeep } from "../../utils/mergeDeep";
import { AManager } from "../abstract/AManager";

export class SettingsManager extends AManager {
  private _settings: GameSettingsSpec;
  private _changeListeners: Set<(settings: GameSettingsSpec) => void>;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this._settings = { ...DEFAULT_SETTINGS };
    this._changeListeners = new Set();
  }

  public _init() {
    const storedSettings = this.getFromStorage();
    this._settings = mergeDeep({ ...this._settings }, { ...storedSettings });
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(this._settings));
  }

  public _destroy() {
    this._changeListeners.clear();
  }

  public subscribeToChange(changeListener: (settings: GameSettingsSpec) => void): VoidFunction {
    if (!this._changeListeners.has(changeListener)) this._changeListeners.add(changeListener);
    return () => this._changeListeners.delete(changeListener);
  }

  public setSettings(settings: DeepPartial<GameSettingsSpec>): void {
    const newSettings = mergeDeep({ ...this._settings }, settings);
    this._settings = newSettings;
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(this._settings));
    for (const listener of this._changeListeners) listener(this._settings);
  }

  public getSettings(): Readonly<GameSettingsSpec> {
    return this._settings;
  }

  public clearStorage() {
    localStorage.removeItem(KEY_SETTINGS);
  }

  public restoreDefaults(): void {
    this.setSettings(DEFAULT_SETTINGS);
  }

  public _exportSettings(): string {
    return JSON.stringify(this._settings);
  }

  private getFromStorage(): GameSettingsSpec | undefined {
    try {
      const settings = JSON.parse(localStorage.getItem(KEY_SETTINGS) || "");
      return settings;
    } catch {
      if (import.meta.env.DEV) console.warn("SettingsManager failed to parse settings from storage");
      return undefined;
    }
  }
}
