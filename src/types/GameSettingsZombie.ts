export interface GameSettingsZombie {
  worldSize: number;
  attackDurationSec: number;
  attackCooldownSec: number;
  hitStateDurationSec: number;
  knockedStateDurationSec: number;
  movementRestartSec: number;
  facingDirThrottleSec: number;

  maxSpeed: number;
  maxHealth: number;

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
