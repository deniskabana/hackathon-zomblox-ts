import type { Weapon } from "../config/weapons";

export interface PlayerState {
  health: number;
  money: number;
  weapon: Weapon;
}
