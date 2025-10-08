export interface WeaponDefinition {
  [weaponName: string]: {
    capacity: number;
    displayName: string;
    shots: number;
    radius: number;
    cooldown: number;
    damage: number;
    reloadSpeed: number;
    cost: number;
    ammoCost: number;
    ammoPurchaseAmount: number;
    maxDistance: number;
    spread: number;
  };
}

export const DEF_WEAPONS = {
  Revolver: {
    capacity: 6,
    displayName: "Revolver",
    shots: 1,
    radius: 3,
    cooldown: 0.5,
    damage: 15,
    reloadSpeed: 8,
    cost: 0,
    ammoCost: 10,
    ammoPurchaseAmount: 46,
    maxDistance: 8,
    spread: 6,
  },
  Shotgun: {
    capacity: 8,
    displayName: "Shotgun",
    shots: 3,
    radius: 12,
    cooldown: 0.9,
    damage: 35,
    reloadSpeed: 8,
    cost: 160,
    ammoCost: 60,
    ammoPurchaseAmount: 24,
    maxDistance: 5,
    spread: 12,
  },
  Submachine: {
    capacity: 27,
    displayName: "SMG",
    shots: 1,
    radius: 4,
    cooldown: 0.18,
    damage: 10,
    reloadSpeed: 7,
    cost: 275,
    ammoCost: 90,
    ammoPurchaseAmount: 62,
    maxDistance: 10,
    spread: 10,
  },
} as const satisfies WeaponDefinition;

export type Weapon = keyof typeof DEF_WEAPONS;
