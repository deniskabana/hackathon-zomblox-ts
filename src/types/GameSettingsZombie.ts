export interface GameSettingsZombie {
  attackDurationSec: number;
  attackCooldownSec: number;

  maxSpeed: number;
  maxHealth: number;

  minDistanceFromPlayerPx: number;
  isHurtBySunlight: boolean;

  movementSeparationWeight: number;
  movementDensityWeight: number;

  debugDrawState: boolean;
  debugDrawSeparationVector: boolean;
  debugDrawFlowFieldVector: boolean;
  debugDrawPosition: boolean;
  debugDrawWireframe: boolean;
}
