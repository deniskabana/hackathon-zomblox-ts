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
  private _game: GameInstance;
  private _visible: boolean = false;
  private _unsubscribeSettings: VoidFunction | null = null;

  constructor(gameInstance: GameInstance) {
    this._game = gameInstance;
    this._gui = new GUI({ title: "Zomblocks Debug Menu", width: 320, autoPlace: true });
    this._gui.close();
    this._build();
  }

  private _build(): void {
    const { SettingsManager } = this._game.MANAGERS;
    const settings = SettingsManager.getSettings();

    const resetButton = { "Reset defaults": () => SettingsManager.restoreDefaults() };
    this._gui.add(resetButton, "Reset defaults");

    const settingsFolder = this._gui.addFolder("Settings");

    for (const sectionKey in SettingsDebugControlSchema) {
      const section = SettingsDebugControlSchema[sectionKey as keyof GameSettingsSpec];
      if (!section) continue;

      const sectionFolder = settingsFolder.addFolder(`Settings / ${sectionKey}`);
      const sectionSettings = settings[sectionKey as keyof GameSettingsSpec];

      // Proxy for this section — lil-gui mutates it directly
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

        controller.name(control.label ?? fieldKey).onChange(() => {
          SettingsManager.setSettings({
            [sectionKey]: { [fieldKey]: proxy[fieldKey] },
          });
        });
      }

      sectionFolder.close();
    }

    settingsFolder.open();
  }

  public subscribeToSettings(): void {
    this._unsubscribeSettings = this._game.MANAGERS.SettingsManager.subscribeToChange(() => {
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
