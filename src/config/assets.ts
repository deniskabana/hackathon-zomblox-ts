interface AssetDefinition {
  [assetName: string]: string;
}

export const DEF_ASSETS_AUDIO = {
  // Player
  APlayerStep: "",
  APlayerHurt: "",
  APlayerDie: "",
  // Gun
  AGunRevolver: "",
  AGunShotgun: "",
  AGunSMG: "",
  AGunRevolverReload: "",

  // Blocks
  ABlockWoodPlaced: "",
  ABlockWoodDamaged: "",
  ABlockWoodDestroyed: "",
  // Zombies
  AZombieAttack: "",
  AZombieDamage: "",
  AZombieDeath: "",
  // FX
  AFXShopPurchase: "",
} as const satisfies AssetDefinition;

export const DEF_ASSETS_IMAGE = {
  // Player
  IPlayerGunRevolver: "/images/survivor_pistol.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunShotgun: "/images/survivor_shotgun.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunRifle: "/images/survivor_rifle.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunSmg: "/images/survivor_smg.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerUnarmed: "/images/survivor_unarmed.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  // Blocks
  IBlockWood: "",
  // Zombies
  IZombie1: "/images/zombie.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IZombie1Dead: "",
  // FX
  IFXBloodSplat: "",
  // Textures
  ITextureGround: "",
  // Shop
  IShopRevolver: "",
  IShopShotgun: "",
  IShopSmg: "",
} as const satisfies AssetDefinition;

export type AssetAudioName = keyof typeof DEF_ASSETS_AUDIO;
export type AssetImageName = keyof typeof DEF_ASSETS_IMAGE;
export type AssetName = AssetAudioName | AssetImageName;
