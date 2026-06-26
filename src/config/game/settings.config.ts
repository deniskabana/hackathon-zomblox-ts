import { GRID_CONFIG } from "../core/grid.config";
import type { GameSettingsBlocks } from "../../types/GameSettingsBlocks";
import type { GameSettingsCollectables } from "../../types/GameSettingsCollectables";
import type { GameSettingsPlayer } from "../../types/GameSettingsPlayer";
import type { GameSettingsZombie } from "../../types/GameSettingsZombie";
import type { SettingsDebugSchema } from "../../utils/classes/DebugPanel";

export const KEY_SETTINGS = "game-manager-key-settings";

export interface GameSettingsSpec {
  gameplay: {
    speedScale: number;

    volumeMaster: number;
    volumeEffects: number;
    volumeMusic: number;
  };

  rules: {
    nightOverlayAlpha: number;
    startingCurrency: number;
    incomeScale: number;
    endNightReward: number;
    autospawn: boolean;
    zombieSpawnIntervalSec: number;

    difficultyIncreaseCoef: number;
    nightDurationSec: number;

    debugSeeThroughNight: boolean;
    debugDrawFlowFieldGrid: boolean;
    debugDrawPhysics: boolean;
  };

  zombie: GameSettingsZombie;
  blocks: GameSettingsBlocks;
  player: GameSettingsPlayer;
  collectables: GameSettingsCollectables;
}

export const DEFAULT_SETTINGS: Readonly<GameSettingsSpec> = {
  gameplay: {
    speedScale: 1,
    volumeMaster: 0,
    volumeEffects: 1,
    volumeMusic: 1,
  },
  rules: {
    nightOverlayAlpha: 1,
    startingCurrency: 10,
    autospawn: true,
    incomeScale: 1,
    zombieSpawnIntervalSec: 3.5,
    endNightReward: 10,
    difficultyIncreaseCoef: 1.2385,
    nightDurationSec: 45,
    debugDrawFlowFieldGrid: false,
    debugSeeThroughNight: false,
    debugDrawPhysics: false,
  },
  zombie: {
    worldSize: GRID_CONFIG.TILE_SIZE * 1.75,
    attackDurationSec: 0.4,
    attackCooldownSec: 2,
    hitStateDurationSec: 0.3,
    knockedStateDurationSec: 3,
    movementRestartSec: 0.5,
    dropsItems: true,
    facingDirThrottleSec: 0.2,
    maxSpeed: 75,
    maxHealth: 37,
    minDistanceFromPlayerPx: GRID_CONFIG.TILE_SIZE * 1,
    isHurtBySunlight: true,
    sunlightDamageIntensity: 4.5,
    movementSeparationWeight: 0.4,
    movementDensityWeight: 0.65,
    debugDrawState: false,
    debugDrawWireframe: false,
    debugDrawFlowFieldVector: false,
    debugDrawPosition: false,
    debugDrawSeparationVector: false,
    debugDrawHitboxes: false,
  },
  player: {
    worldSize: GRID_CONFIG.TILE_SIZE * 1.75,
    startHealth: 200,
    movementSpeed: 210,
    defaultWeapon: "Revolver",
    lightRadius: 4.5,
    stunCooldownSec: 2,
    stepSoundCooldownSec: 0.39,
    debugDrawState: false,
    debugDrawPosition: false,
    debugDrawWireframe: false,
    debugDrawHitboxes: false,
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
    lifetimeCoin: 12,
    emitLight: false,
    minDistanceFromPlayerPx: GRID_CONFIG.TILE_SIZE * 0.3,
    debugDrawWireframe: false,
  },
} as const;

export const SettingsDebugControlSchema: SettingsDebugSchema = {
  gameplay: {
    speedScale: { type: "number", min: 0, max: 10, step: 0.05 },
    volumeMaster: { type: "number", min: 0, max: 1, step: 0.05 },
    volumeEffects: { type: "number", min: 0, max: 1, step: 0.05 },
    volumeMusic: { type: "number", min: 0, max: 1, step: 0.05 },
  },
  rules: {
    nightOverlayAlpha: { type: "number", min: 0, max: 1, step: 0.02 },
    autospawn: { type: "boolean" },
    startingCurrency: { type: "number", min: 0, max: 1000, step: 5 },
    zombieSpawnIntervalSec: { type: "number", min: 0, max: 10, step: 0.1 },
    incomeScale: { type: "number", min: 0, max: 10, step: 1 },
    endNightReward: { type: "number", min: 0, max: 1000, step: 5 },
    difficultyIncreaseCoef: { type: "number", min: 0, max: 8, step: 0.1 },
    nightDurationSec: { type: "number", min: 0, max: 1000, step: 5 },
    debugSeeThroughNight: { type: "boolean" },
    debugDrawFlowFieldGrid: { type: "boolean" },
    debugDrawPhysics: { type: "boolean" },
  },
  zombie: {
    worldSize: { type: "number", min: 0, max: GRID_CONFIG.TILE_SIZE * 10, step: GRID_CONFIG.TILE_SIZE / 10 },
    attackDurationSec: { type: "number", min: 0, max: 10, step: 0.1 },
    attackCooldownSec: { type: "number", min: 0, max: 10, step: 0.1 },
    dropsItems: { type: "boolean" },
    hitStateDurationSec: { type: "number", min: 0, max: 10, step: 0.1 },
    knockedStateDurationSec: { type: "number", min: 0, max: 10, step: 0.1 },
    movementRestartSec: { type: "number", min: 0, max: 10, step: 0.1 },
    facingDirThrottleSec: { type: "number", min: 0, max: 10, step: 0.1 },
    maxSpeed: { type: "number", min: 0, max: 1000, step: 5 },
    maxHealth: { type: "number", min: 0, max: 1000, step: 5 },
    minDistanceFromPlayerPx: {
      type: "number",
      min: 0,
      max: GRID_CONFIG.TILE_SIZE * 10,
      step: GRID_CONFIG.TILE_SIZE / 10,
    },
    isHurtBySunlight: { type: "boolean" },
    sunlightDamageIntensity: { type: "number", min: 0, max: 40, step: 1 },
    movementSeparationWeight: { type: "number", min: 0, max: 1, step: 0.05 },
    movementDensityWeight: { type: "number", min: 0, max: 1, step: 0.05 },
    debugDrawState: { type: "boolean" },
    debugDrawSeparationVector: { type: "boolean" },
    debugDrawFlowFieldVector: { type: "boolean" },
    debugDrawPosition: { type: "boolean" },
    debugDrawWireframe: { type: "boolean" },
    debugDrawHitboxes: { type: "boolean" },
  },
  blocks: {
    enableDestruction: { type: "boolean" },
    healthWood: { type: "number", min: 0, max: 1000, step: 5 },
    healthFireBarrel: { type: "number", min: 0, max: 1000, step: 5 },
    debugDrawHealth: { type: "boolean" },
    debugDrawWireframe: { type: "boolean" },
  },
  player: {
    worldSize: { type: "number", min: 0, max: GRID_CONFIG.TILE_SIZE * 10, step: GRID_CONFIG.TILE_SIZE / 10 },
    startHealth: { type: "number", min: 0, max: 1000, step: 5 },
    movementSpeed: { type: "number", min: 0, max: 1000, step: 5 },
    defaultWeapon: undefined,
    lightRadius: { type: "number", min: 0, max: 40, step: 0.01 },
    stunCooldownSec: { type: "number", min: 0, max: 100, step: 0.1 },
    stepSoundCooldownSec: { type: "number", min: 0, max: 5, step: 0.01 },
    debugIsInvincible: { type: "boolean" },
    debugDisablePhysics: { type: "boolean" },
    debugDrawState: { type: "boolean" },
    debugDrawPosition: { type: "boolean" },
    debugDrawWireframe: { type: "boolean" },
    debugDrawHitboxes: { type: "boolean" },
  },
  collectables: {
    autoCollect: { type: "boolean" },
    lifetimeCoin: { type: "number", min: 0, max: 1000, step: 1 },
    emitLight: { type: "boolean" },
    minDistanceFromPlayerPx: { type: "boolean" },
    debugDrawWireframe: { type: "boolean" },
  },
};
