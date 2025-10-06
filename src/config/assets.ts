interface AssetDefinition {
  [assetName: string]: string;
}

// TODO: Add asset urls lol

export const DEF_ASSETS_AUDIO = {
  // Player
  APlayerGunPistol: "",
  APlayerGunShotgun: "",
  APlayerGunSMG: "",
  // Blocks
  ABlockWoodPlaced: "",
  ABlockWoodDamaged: "",
  ABlockWoodDestroyed: "",
  // Zombies
  AZombieAttack: "",
  AZombieDamaged: "",
  AZombieDeath1: "",
  AZombieDeath2: "",
  // FX
  AFXShopPurchase: "",
} as const satisfies AssetDefinition;

export const DEF_ASSETS_IMAGE = {
  // Player
  IPlayerSkinDefault: "",
  IPlayerGunPistol: "",
  IPlayerGunShotgun: "",
  IPlayerGunSMG: "",
  // Blocks
  IBlockWood: "",
  // Zombies
  IZombie1: "",
  IZombie1Dead: "",
  // FX
  IFXBloodSplat: "",
} as const satisfies AssetDefinition;

export type AssetAudioName = keyof typeof DEF_ASSETS_AUDIO;
export type AssetImageName = keyof typeof DEF_ASSETS_IMAGE;
export type AssetName = AssetAudioName | AssetImageName;
