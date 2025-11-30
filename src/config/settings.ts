import { GRID_CONFIG } from "./gameGrid";
import type { Weapon } from "./weapons";

export const KEY_SETTINGS = "game-manager-key-settings";

export const DEFAULT_SETTINGS = {
  volume: { master: 1, music: 1, effects: 1 },
  debug: { enableFlowFieldRender: false, showZombieState: false, showZombieTarget: false, seeThroughNight: false },
  rules: {
    game: {
      startCurrency: 10,
      enableRewardAutoCollect: false,
      coinLifetime: 20,
      rewardCoef: 1,
      zombieSpawnIntervalMs: 1200,
      zombieSpawnAmount: 25,
      zombieSpawnCoef: 1.18,
      nightDurationSec: 10,
      enableBlocksDestruction: true,
      startZombiesAmount: 5,
      playerLightRadius: 3.65,
    },
    zombie: {
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 50,
      speedDeviation: 15,
      maxHealth: 22,
      healthDeviation: 10,
      randomStopIntervalSec: 11,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
      attackDamage: 4,
      attackDamageDeviation: 1,
      attackCooldownSec: 1.5,
      attackPushbackStr: 6,
      minDistanceFromPlayer: GRID_CONFIG.TILE_SIZE * 1.2,
    },
    player: {
      startHealth: 100,
      movementSpeed: 180,
      defaultWeapon: "Submachine" as Weapon,
    },
    blocks: {
      woodStartHealth: 30,
      concreteStartHealth: 500,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
