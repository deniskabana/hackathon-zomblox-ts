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

const MENU_TITLE = "🪲 ";

export class DebugPanel {
  private _guis: GUI[];
  private _gameInstance: GameInstance;
  private _visible: boolean;
  private _unsubscribeSettings: VoidFunction | null = null;
  private _proxies: Record<string, Record<string, unknown>> = {};
  private _speedProxy: { speedScale: number } = { speedScale: 1 };
  private _entityProxies:
    | Record<
        "players" | "zombies" | "collectables" | "blocks",
        Record<
          number,
          {
            entityId: number;
            state: string;
            health: number;
            isDead: boolean;
            x: number;
            y: number;
            [key: string]: unknown;
          }
        >
      >
    | undefined;

  constructor(gameInstance: GameInstance) {
    this._gameInstance = gameInstance;
    this._guis = [];

    this._buildControlsFolder();
    this._buildSettingsFolder();
    this._buildInspectorFolder();

    // Hide by default
    for (const gui of this._guis) gui.hide();
    this._visible = false;
  }

  private _buildControlsFolder(): void {
    const { LevelManager, EntityManager } = this._gameInstance.MANAGERS;
    const gui = new GUI({ title: MENU_TITLE + "Game Controls", autoPlace: true, injectStyles: true });
    gui.root.domElement.style = 'width: 300px; right: 0; font-family: "Syne Mono", monospace;';
    this._guis.push(gui);

    const levelFolder = gui.addFolder("Level");
    const levelActions = {
      "🌛 Start Night": () => LevelManager.startNight(),
      "🌤️ Start Day": () => LevelManager.startDay(),
    };
    levelFolder.add(levelActions, "🌛 Start Night").domElement.style = "display: inline-flex; width: 50%;";
    levelFolder.add(levelActions, "🌤️ Start Day").domElement.style = "display: inline-flex; width: 50%;";

    const zombiesFolder = gui.addFolder("Zombies");
    const zombieActions = {
      "Spawn 1": () => LevelManager.spawnZombie(),
      "Spawn 10": () => {
        for (let i = 0; i < 10; i++) LevelManager.spawnZombie();
      },
      "Spawn 100": () => {
        for (let i = 0; i < 100; i++) LevelManager.spawnZombie();
      },
      "☠️ Kill all": () => {
        for (const zombie of EntityManager.getEnemies()) zombie._handleDamage(Infinity);
      },
      "❌ Despawn all": () => {
        for (const zombie of EntityManager.getEnemies()) EntityManager.destroyEntity(zombie._getEntityId());
      },
    };

    zombiesFolder.add(zombieActions, "Spawn 1").domElement.style = "display: inline-flex; width: calc(100% / 3);";
    zombiesFolder.add(zombieActions, "Spawn 10").domElement.style = "display: inline-flex; width: calc(100% / 3);";
    zombiesFolder.add(zombieActions, "Spawn 100").domElement.style = "display: inline-flex; width: calc(100% / 3);";
    zombiesFolder.add(zombieActions, "☠️ Kill all").domElement.style = "display: inline-flex; width: 50%;";
    zombiesFolder.add(zombieActions, "❌ Despawn all").domElement.style = "display: inline-flex; width: 50%;";

    const gameplayFolder = gui.addFolder("Gameplay");
    this._speedProxy = { speedScale: this._gameInstance.MANAGERS.SettingsManager.getSettings().gameplay.speedScale };
    const speedScales = { Pause: 0, "0.1x": 0.1, "0.25x": 0.25, "0.5x": 0.5, Normal: 1, "2x": 2, "4x": 4, "10x": 10 };

    gameplayFolder
      .add(this._speedProxy, "speedScale", 0, 10, 0.05)
      .name("Speed Scale")
      .onChange(() => this._setSpeedScale(this._speedProxy.speedScale))
      .listen();

    for (const [label, value] of Object.entries(speedScales)) {
      gameplayFolder.add({ [label]: () => this._setSpeedScale(value) }, label).domElement.style =
        "display: inline-flex; width: 25%;";
    }

    zombiesFolder.open();
    gameplayFolder.open();
    // gui.close();
  }

  private _setSpeedScale(value: number): void {
    this._gameInstance.MANAGERS.SettingsManager.setSettings({ gameplay: { speedScale: value } });
  }

  private _buildSettingsFolder(): void {
    const { SettingsManager } = this._gameInstance.MANAGERS;
    const settings = SettingsManager.getSettings();
    const gui = new GUI({ title: MENU_TITLE + "Settings & sliders", autoPlace: true, injectStyles: true });
    gui.root.domElement.style = "right: 310px; width: 360px;";
    this._guis.push(gui);

    for (const sectionKey in SettingsDebugControlSchema) {
      const section = SettingsDebugControlSchema[sectionKey as keyof GameSettingsSpec];
      if (!section) continue;

      const sectionSettings = settings[sectionKey as keyof GameSettingsSpec];
      const name = sectionKey[0].toLocaleUpperCase() + sectionKey.slice(1);
      const sectionFolder = gui.addFolder(name);

      const controlsFolder = sectionFolder.addFolder(name + " Controls");
      let debugFolder: GUI | undefined = undefined;
      if (Object.keys(section).some((name) => name.startsWith("debug")))
        debugFolder = sectionFolder.addFolder(name + " Debug");

      const proxy: Record<string, unknown> = {};

      for (const fieldKey in section) {
        const control = section[fieldKey as keyof typeof section] as DebugControl;
        if (!control) continue;
        proxy[fieldKey] = sectionSettings[fieldKey as keyof typeof sectionSettings];
        const fieldName = fieldKey
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (c) => c.toUpperCase())
          .trim();

        const folderToAdd = fieldKey.startsWith("debug") ? (debugFolder ?? controlsFolder) : controlsFolder;

        const controller = (() => {
          switch (control.type) {
            case "boolean":
              return folderToAdd.add(proxy, fieldKey);
            case "number":
              return folderToAdd.add(proxy, fieldKey, control.min, control.max, control.step);
            case "string":
              return control.options?.length
                ? folderToAdd.add(proxy, fieldKey, control.options)
                : folderToAdd.add(proxy, fieldKey);
          }
        })();

        this._proxies[sectionKey] = proxy;

        controller.name(fieldName).onChange(() => {
          SettingsManager.setSettings({ [sectionKey]: { [fieldKey]: proxy[fieldKey] } });
        });
      }

      sectionFolder.close();
    }

    gui.add({ "Reset Defaults": () => SettingsManager.restoreDefaults() }, "Reset Defaults");
    gui.close();
  }

  private _buildInspectorFolder(): void {
    const gui = new GUI({ title: MENU_TITLE + "Zombie Inspector", autoPlace: true, injectStyles: true });
    gui.root.domElement.style = 'width: 300px; right: 680px; font-family: "Syne Mono", monospace;';
    this._guis.push(gui);

    this._entityProxies = {
      players: [],
      zombies: [],
      collectables: [],
      blocks: [],
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeDebug = (window as any)._DEBUG_gameInstance as GameInstance;

    // const playersFolder = gui.addFolder("Players");
    const zombiesFolder = gui.addFolder("Zombies");

    const syncEntities = () => {
      if (!this._entityProxies) return;

      const enemySet = new Set(Object.keys(this._entityProxies.zombies).map((z) => z));
      const enemies = runtimeDebug.MANAGERS.EntityManager.getEnemies();

      for (const zombie of enemies) {
        const id = zombie._getEntityId();
        enemySet.delete(String(id));

        const snapshot = zombie._toDebugSnapshot();

        // Updates values
        if (!this._entityProxies.zombies[id]) this._entityProxies.zombies[id] = {} as never;
        for (const key in snapshot) this._entityProxies.zombies[id][key] = snapshot[key];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._entityProxies.zombies[id].x = (snapshot as any).worldPos.x;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this._entityProxies.zombies[id].y = (snapshot as any).worldPos.y;

        let folder = zombiesFolder.folders.find((f) => f._title === String(id));
        if (folder) continue;
        folder = zombiesFolder.addFolder(String(id));

        folder.add(this._entityProxies.zombies[id], "state").listen();
        folder.add(this._entityProxies.zombies[id], "health").listen();
        folder.add(this._entityProxies.zombies[id], "x").listen().domElement.style =
          "display: inline-flex; width: 50%;";
        folder.add(this._entityProxies.zombies[id], "y").listen().domElement.style =
          "display: inline-flex; width: 50%;";

        const actions = {
          Kill: () => zombie._handleDamage(Infinity),
          Despawn: () => runtimeDebug.MANAGERS.EntityManager.destroyEntity(id),
        };
        folder.add(actions, "Kill").domElement.style = "display: inline-flex; width: 50%;";
        folder.add(actions, "Despawn").domElement.style = "display: inline-flex; width: 50%;";
      }

      for (const enemyId of enemySet) {
        zombiesFolder
          .foldersRecursive()
          .find((z) => z._title === enemyId)
          ?.destroy();
        delete this._entityProxies.zombies[Number(enemyId)];
      }
    };

    syncEntities();
    setInterval(syncEntities, 1000 / 10);

    const proxy = {
      "Sync all entities": syncEntities,
    };
    gui.add(proxy, "Sync all entities");

    gui.close();
  }

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

      for (const gui of this._guis) gui.controllersRecursive().forEach((c) => c.updateDisplay());
    });
  }

  public toggle(): void {
    this._visible = !this._visible;
    for (const gui of this._guis) {
      if (this._visible) gui.show();
      else gui.hide();
    }
  }

  public destroy(): void {
    this._unsubscribeSettings?.();
    for (const gui of this._guis) gui.destroy();
  }
}
