import type { Weapon } from "../config/game/weapons.config";

export interface GameSettingsPlayer {
  startHealth: number;
  movementSpeed: number;
  stunCooldownSec: number;
  defaultWeapon: Weapon;
  lightRadius: number;

  debugIsInvincible: boolean;
  debugDisablePhysics: boolean;

  debugDrawState: boolean;
  debugDrawPosition: boolean;
  debugDrawWireframe: boolean;
}
