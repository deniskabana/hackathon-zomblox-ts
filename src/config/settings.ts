import type { LevelState } from "../types/LevelState";
import { GRID_CONFIG } from "./gameGrid";
import type { Weapon } from "./weapons";

export const KEY_SETTINGS = "game-manager-key-settings";

export const DEFAULT_SETTINGS = {
  volume: { master: 1, music: 1, effects: 1 },
  debug: { enableFlowFieldRender: false, showZombieState: false, showZombieTarget: false },
  rules: {
    game: {
      startPhase: "night" as LevelState["phase"],
      startCurrency: 0,
      enableRewardAutoCollect: true,
      rewardCoef: 1,
      zombieSpawnIntervalMs: 200,
      zombieSpawnAmount: 40,
      zombieSpawnCoef: 1.2,
      nightDurationSec: 15,
      enableBlocksDestruction: true,
      startZombiesAmount: 4,
    },
    zombie: {
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 55,
      speedDeviation: 20,
      maxHealth: 50,
      healthDeviation: 20,
      randomStopIntervalSec: 11,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
      attackDamage: 4,
      attackDamageDeviation: 3,
      attackCooldownSec: 1.2,
      attackPushbackStr: 10,
      minDistanceFromPlayer: GRID_CONFIG.TILE_SIZE * 1.2,
    },
    player: {
      startHealth: 100,
      movementSpeed: 200,
      defaultWeapon: "Revolver" as Weapon,
    },
    blocks: {
      woodStartHealth: 50,
      concreteStartHealth: 500,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
