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
      zombieSpawnAmount: 10,
      zombieSpawnCoef: 1.185,
      nightDurationSec: 40,
      enableBlocksDestruction: true,
      startZombiesAmount: 10,
      playerLightRadius: 4.5,
      endNightReward: 5,
    },
    zombie: {
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 60,
      speedDeviation: 15,
      maxHealth: 24,
      healthDeviation: 10,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
      attackDamage: 5,
      attackDamageDeviation: 1,
      attackCooldownSec: 2,
      attackPushbackStr: 6,
      minDistanceFromPlayer: GRID_CONFIG.TILE_SIZE * 1.2,
    },
    player: {
      startHealth: 100,
      movementSpeed: 150,
      stunCooldownSec: 0.9,
      defaultWeapon: "Revolver" as Weapon,
    },
    blocks: {
      woodStartHealth: 30,
      concreteStartHealth: 500,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
