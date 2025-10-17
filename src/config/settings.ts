import type { LevelState } from "../types/LevelState";
import type { Weapon } from "./weapons";

export const KEY_SETTINGS = "game-manager-key-settings";

export const DEFAULT_SETTINGS = {
  volume: { master: 1, music: 1, effects: 1 },
  debug: { enableFlowFieldRender: false },
  rules: {
    game: {
      startPhase: "night" as LevelState["phase"],
      startCurrency: 0,
      enableRewardAutoCollect: true,
      rewardCoef: 1,
      zombieSpawnIntervalMs: 1200,
      zombieSpawnAmount: 20,
      zombieSpawnCoef: 1.2,
      nightDurationSec: 120,
      enableBlocksDestruction: true,
    },
    zombie: {
      startZombiesAmount: 5,
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 50,
      speedDeviation: 30,
      maxHealth: 50,
      healthDeviation: 20,
      randomStopIntervalSec: 11,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
    },
    player: {
      startHealth: 100,
      movementSpeed: 200,
      defaultWeapon: "Revolver" as Weapon,
    },
    blocks: {
      woodStartHealth: 100,
      concreteStartHealth: 1000,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
