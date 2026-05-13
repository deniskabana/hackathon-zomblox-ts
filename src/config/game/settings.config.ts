import { GRID_CONFIG } from "../core/grid.config";
import type { GameSettingsBlocks } from "../../types/GameSettingsBlocks";
import type { GameSettingsCollectables } from "../../types/GameSettingsCollectables";
import type { GameSettingsPlayer } from "../../types/GameSettingsPlayer";
import type { GameSettingsZombie } from "../../types/GameSettingsZombie";

export const KEY_SETTINGS = "game-manager-key-settings";

export interface GameSettingsSpec {
  gameplay: {
    speedScale: number;

    volumeMaster: number;
    volumeEffects: number;
    volumeMusic: number;
  };

  rules: {
    startingCurrency: number;
    incomeScale: number;
    endNightReward: number;

    difficultyIncreaseCoef: number;
    nightDurationSec: number;

    debugSeeThroughNight: boolean;
    debugDrawFlowFieldGrid: boolean;
  };

  zombie: GameSettingsZombie;
  blocks: GameSettingsBlocks;
  player: GameSettingsPlayer;
  collectables: GameSettingsCollectables;
}

export const DEFAULT_SETTINGS: GameSettingsSpec = {
  gameplay: {
    speedScale: 1,
    volumeMaster: 1,
    volumeEffects: 1,
    volumeMusic: 1,
  },
  rules: {
    startingCurrency: 10,
    incomeScale: 1,
    endNightReward: 10,
    difficultyIncreaseCoef: 1.2385,
    nightDurationSec: 60,
    debugDrawFlowFieldGrid: false,
    debugSeeThroughNight: false,
  },
  zombie: {
    worldSize: GRID_CONFIG.TILE_SIZE * 1.5,
    attackDurationSec: 0.4,
    attackCooldownSec: 2,
    hitStateDurationSec: 0.3,
    movementRestartSec: 0.5,
    facingDirThrottleSec: 0.2,
    maxSpeed: 60,
    maxHealth: 30,
    minDistanceFromPlayerPx: GRID_CONFIG.TILE_SIZE * 1.65,
    isHurtBySunlight: true,
    stunHealthPercentThreshold: 0.25,
    sunlightDamageIntensity: 5.5,
    movementSeparationWeight: 0.85,
    movementDensityWeight: 0.9,
    debugDrawState: false,
    debugDrawWireframe: false,
    debugDrawFlowFieldVector: false,
    debugDrawPosition: false,
    debugDrawSeparationVector: false,
  },
  player: {
    worldSize: GRID_CONFIG.TILE_SIZE * 1.5,
    startHealth: 200,
    movementSpeed: 160,
    defaultWeapon: "Revolver",
    lightRadius: 4.5,
    stunCooldownSec: 2,
    stepSoundCooldownSec: 0.35,
    debugDrawState: false,
    debugDrawPosition: false,
    debugDrawWireframe: false,
    debugIsInvincible: false,
    debugDisablePhysics: false,
  },
  blocks: {
    enableDestruction: true,
    healthWood: 60,
    healthFireBarrel: 70,
    debugDrawHealth: false,
    debugDrawWireframe: false,
  },
  collectables: {
    autoCollect: false,
    lifetimeCoin: 6,
    emitLight: true,
    minDistanceFromPlayerPx: GRID_CONFIG.TILE_SIZE * 0.3,
    debugDrawWireframe: false,
  },
};
