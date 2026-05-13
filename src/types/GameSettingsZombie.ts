export interface GameSettingsZombie {
  worldSize: number;
  attackDurationSec: number;
  attackCooldownSec: number;
  hitStateDurationSec: number;
  movementRestartSec: number;
  facingDirThrottleSec: number;

  maxSpeed: number;
  maxHealth: number;
  /** Gets stunned if 0-1 maxHealth is damaged */
  stunHealthPercentThreshold: number;

  minDistanceFromPlayerPx: number;
  isHurtBySunlight: boolean;
  sunlightDamageIntensity: number;

  movementSeparationWeight: number;
  movementDensityWeight: number;

  debugDrawState: boolean;
  debugDrawSeparationVector: boolean;
  debugDrawFlowFieldVector: boolean;
  debugDrawPosition: boolean;
  debugDrawWireframe: boolean;
}
