import GUI from "lil-gui";
import type GameInstance from "../../GameInstance";
import { SettingsDebugControlSchema, type GameSettingsSpec } from "../../config/game/settings.config";

export interface BooleanControl {
  type: "boolean";
  label?: string;
}

export interface NumberControl {
  type: "number";
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface StringControl {
  type: "string";
  label?: string;
  options?: string[];
}

export type DebugControl = BooleanControl | NumberControl | StringControl;

export type SettingsDebugSchema = {
  [K in keyof GameSettingsSpec]: {
    [N in keyof GameSettingsSpec[K]]: DebugControl | undefined;
  };
};

export class DebugPanel {
  private _gui: GUI;
  private _gameInstance: GameInstance;
  private _visible: boolean = false;
  private _unsubscribeSettings: VoidFunction | null = null;
  private _proxies: Record<string, Record<string, unknown>> = {};
  private _speedProxy: { speedScale: number } = { speedScale: 1 };

  constructor(gameInstance: GameInstance) {
    this._gameInstance = gameInstance;
    this._gui = new GUI({ title: "Zomblocks Debug Menu", width: 320 });

    this._buildControlsFolder();
    this._buildSettingsFolder();
    this._gui.hide();
  }

  // ---------------------------------------------------------------------------
  // Game controls
  // ---------------------------------------------------------------------------

  private _buildControlsFolder(): void {
    const { LevelManager } = this._gameInstance.MANAGERS;
    const folder = this._gui.addFolder("Game Controls");

    const zombiesFolder = folder.addFolder("Game Controls / Zombies");
    const zombieActions = {
      "Spawn Random": () => LevelManager.spawnZombie(),
    };
    zombiesFolder.add(zombieActions, "Spawn Random");

    const gameplayFolder = folder.addFolder("Game Controls / Gameplay");
    this._speedProxy = { speedScale: this._gameInstance.MANAGERS.SettingsManager.getSettings().gameplay.speedScale };
    const speedScales = { "0.5x": 0.5, "1x": 1, "2x": 2, "4x": 4 };

    for (const [label, value] of Object.entries(speedScales)) {
      gameplayFolder.add({ [label]: () => this._setSpeedScale(value) }, label);
    }

    // Slider stays in sync with buttons
    gameplayFolder
      .add(this._speedProxy, "speedScale", 0, 4, 0.05)
      .name("Speed Scale")
      .onChange(() => this._setSpeedScale(this._speedProxy.speedScale))
      .listen(); // reflects external changes

    folder.open();
    zombiesFolder.open();
    gameplayFolder.open();
  }

  private _setSpeedScale(value: number): void {
    this._gameInstance.MANAGERS.SettingsManager.setSettings({ gameplay: { speedScale: value } });
  }

  // ---------------------------------------------------------------------------
  // Settings — schema driven
  // ---------------------------------------------------------------------------

  private _buildSettingsFolder(): void {
    const { SettingsManager } = this._gameInstance.MANAGERS;
    const settings = SettingsManager.getSettings();

    const settingsFolder = this._gui.addFolder("Settings");
    settingsFolder.add({ "Reset Defaults": () => SettingsManager.restoreDefaults() }, "Reset Defaults");

    for (const sectionKey in SettingsDebugControlSchema) {
      const section = SettingsDebugControlSchema[sectionKey as keyof GameSettingsSpec];
      if (!section) continue;

      const sectionSettings = settings[sectionKey as keyof GameSettingsSpec];
      const sectionFolder = settingsFolder.addFolder("Settings / " + sectionKey);

      const proxy: Record<string, unknown> = {};
      for (const fieldKey in section) {
        proxy[fieldKey] = sectionSettings[fieldKey as keyof typeof sectionSettings];
      }

      for (const fieldKey in section) {
        const control = section[fieldKey as keyof typeof section] as DebugControl;
        if (!control) continue;

        const controller = (() => {
          switch (control.type) {
            case "boolean":
              return sectionFolder.add(proxy, fieldKey);
            case "number":
              return sectionFolder.add(proxy, fieldKey, control.min, control.max, control.step);
            case "string":
              return control.options?.length
                ? sectionFolder.add(proxy, fieldKey, control.options)
                : sectionFolder.add(proxy, fieldKey);
          }
        })();

        this._proxies[sectionKey] = proxy;

        controller.name(control.label ?? fieldKey).onChange(() => {
          SettingsManager.setSettings({ [sectionKey]: { [fieldKey]: proxy[fieldKey] } });
        });
      }

      sectionFolder.close();
    }

    settingsFolder.close();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  public subscribeToSettings(): void {
    this._unsubscribeSettings = this._gameInstance.MANAGERS.SettingsManager.subscribeToChange((settings) => {
      this._speedProxy.speedScale = settings.gameplay.speedScale;

      for (const sectionKey in this._proxies) {
        const sectionSettings = settings[sectionKey as keyof GameSettingsSpec];
        const proxy = this._proxies[sectionKey];
        for (const fieldKey in proxy) {
          proxy[fieldKey] = sectionSettings[fieldKey as keyof typeof sectionSettings];
        }
      }

      this._gui.controllersRecursive().forEach((c) => c.updateDisplay());
    });
  }

  public toggle(): void {
    this._visible = !this._visible;
    if (this._visible) this._gui.show();
    else this._gui.hide();
  }

  public destroy(): void {
    this._unsubscribeSettings?.();
    this._gui.destroy();
  }
}
