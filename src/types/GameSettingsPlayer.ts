import type { Weapon } from "../config/game/weapons.config";

export interface GameSettingsPlayer {
  worldSize: number;
  startHealth: number;
  movementSpeed: number;
  defaultWeapon: Weapon;
  lightRadius: number;

  stunCooldownSec: number;
  stepSoundCooldownSec: number;

  debugIsInvincible: boolean;
  debugDisablePhysics: boolean;

  debugDrawState: boolean;
  debugDrawPosition: boolean;
  debugDrawWireframe: boolean;
}
