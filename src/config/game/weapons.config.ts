export interface WeaponDefinition {
  [weaponName: string]: {
    capacity: number;
    displayName: string;
    shots: number;
    radius: number;
    cooldown: number;
    damage: number;
    reloadTimeSec: number;
    maxDistance: number;
    spread: number;
  };
}

export const DEF_WEAPONS = {
  Revolver: {
    capacity: 6,
    displayName: "Revolver",
    shots: 1,
    radius: 0,
    cooldown: 0.5,
    damage: 13,
    reloadTimeSec: 3.2,
    maxDistance: 8,
    spread: 0,
  },
  Shotgun: {
    capacity: 9,
    displayName: "Shotgun",
    shots: 3,
    radius: 19,
    cooldown: 0.8,
    damage: 18,
    reloadTimeSec: 4,
    maxDistance: 6,
    spread: 30,
  },
  Submachine: {
    capacity: 25,
    displayName: "SMG",
    shots: 1,
    radius: 0,
    cooldown: 0.12,
    damage: 5,
    reloadTimeSec: 2.5,
    maxDistance: 7,
    spread: 0,
  },
} as const satisfies WeaponDefinition;

export type Weapon = keyof typeof DEF_WEAPONS;
