import { GRID_CONFIG } from "../core/grid.config";
import type { Weapon } from "./weapons.config";

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
      zombieSpawnIntervalMs: 800,
      zombieSpawnAmount: 30,
      zombieSpawnCoef: 1.285,
      nightDurationSec: 30,
      enableBlocksDestruction: true,
      startZombiesAmount: 15,
      playerLightRadius: 4.5,
      endNightReward: 5,
    },
    zombie: {
      enableErraticBehavior: true,
      enableErraticNavOffset: true,
      swimChanceNilToOne: 1,
      maxSpeed: 50,
      speedDeviation: 10,
      maxHealth: 28,
      healthDeviation: 10,
      enableDamagedSlowdown: true,
      damagedSlowdownCoef: 0.5,
      attackDuration: 0.4,
      attackDamage: 5,
      attackDamageDeviation: 1,
      attackCooldownSec: 2,
      attackPushbackStr: 5,
      minDistanceFromPlayer: GRID_CONFIG.TILE_SIZE * 1.65,
    },
    player: {
      startHealth: 100,
      movementSpeed: 160,
      stunCooldownSec: 0,
      defaultWeapon: "Revolver" as Weapon,
    },
    blocks: {
      woodStartHealth: 30,
      concreteStartHealth: 500,
    },
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
