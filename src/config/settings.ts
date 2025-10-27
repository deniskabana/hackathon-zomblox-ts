import { GRID_CONFIG } from "./gameGrid";
import type { Weapon } from "./weapons";

export const KEY_SETTINGS = "game-manager-key-settings";

export const DEFAULT_SETTINGS = {
  volume: { master: 1, music: 1, effects: 1 },
  debug: { enableFlowFieldRender: false, showZombieState: false, showZombieTarget: false },
  rules: {
    game: {
      startCurrency: 0,
      enableRewardAutoCollect: true,
      rewardCoef: 1,
      zombieSpawnIntervalMs: 800,
      zombieSpawnAmount: 30,
      zombieSpawnCoef: 1.2,
      nightDurationSec: 50,
      enableBlocksDestruction: true,
      startZombiesAmount: 8,
    },
    zombie: {
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 65,
      speedDeviation: 40,
      maxHealth: 25,
      healthDeviation: 15,
      randomStopIntervalSec: 11,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
      attackDamage: 5,
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
      woodStartHealth: 20,
      concreteStartHealth: 500,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
