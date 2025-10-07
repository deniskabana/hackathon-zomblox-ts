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
  IBlockWood: "/images/RTS_Crate.png", // https://opengameart.org/content/2d-wooden-box
  // Zombies
  IZombie1: "/images/zombie.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  // FX
  IFXBloodSplat: "/images/pi58p94iB.png", // https://www.clipartbest.com/clipart-pi58p94iB
  // Textures
  ITextureGround: "/images/Texture_11_Diffuse.png", // https://oleekconder.itch.io/stylized-nature-textures
  // Shop
  IShopRevolver: "/images/Revolver - Colt 45 [64x32].png", // https://arcadeisland.itch.io/guns-asset-pack-v1
  IShopShotgun: "/images/[32x96]Shotgun_V1.00.png", // https://arcadeisland.itch.io/guns-asset-pack-v1
  IShopSmg: "/images/Submachine - MP5A3 [80x48].png", // https://arcadeisland.itch.io/guns-asset-pack-v1
} as const satisfies AssetDefinition;

export type AssetAudioName = keyof typeof DEF_ASSETS_AUDIO;
export type AssetImageName = keyof typeof DEF_ASSETS_IMAGE;
export type AssetName = AssetAudioName | AssetImageName;
