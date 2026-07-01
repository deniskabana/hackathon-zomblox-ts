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
    radius: 3,
    cooldown: 0.5,
    damage: 12,
    reloadTimeSec: 3.5,
    maxDistance: 10,
    spread: 0,
  },
  Shotgun: {
    capacity: 9,
    displayName: "Shotgun",
    shots: 3,
    radius: 19,
    cooldown: 1.1,
    damage: 18,
    reloadTimeSec: 4,
    maxDistance: 6,
    spread: 30,
  },
  Submachine: {
    capacity: 18,
    displayName: "SMG",
    shots: 1,
    radius: 4,
    cooldown: 0.12,
    damage: 5,
    reloadTimeSec: 2.7,
    maxDistance: 8,
    spread: 0,
  },
} as const satisfies WeaponDefinition;

export type Weapon = keyof typeof DEF_WEAPONS;
