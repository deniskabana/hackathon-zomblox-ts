export interface WeaponDefinition {
  [weaponName: string]: {
    capacity: number;
    displayName: string;
    shots: number;
    radius: number;
    cooldown: number;
    damage: number;
    reloadTimeSec: number;
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
    damage: 12,
    reloadTimeSec: 3.5,
    cost: 0,
    ammoCost: 10,
    ammoPurchaseAmount: 46,
    maxDistance: 10,
    spread: 0,
  },
  Shotgun: {
    capacity: 9,
    displayName: "Shotgun",
    shots: 3,
    radius: 19,
    cooldown: 1.4,
    damage: 18,
    reloadTimeSec: 4,
    cost: 160,
    ammoCost: 60,
    ammoPurchaseAmount: 24,
    maxDistance: 6,
    spread: 30,
  },
  Submachine: {
    capacity: 18,
    displayName: "SMG",
    shots: 1,
    radius: 4,
    cooldown: 0.2,
    damage: 5,
    reloadTimeSec: 2.7,
    cost: 275,
    ammoCost: 90,
    ammoPurchaseAmount: 62,
    maxDistance: 8,
    spread: 0,
  },
} as const satisfies WeaponDefinition;

export type Weapon = keyof typeof DEF_WEAPONS;
