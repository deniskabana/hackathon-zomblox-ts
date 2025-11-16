interface AssetDefinition {
  [assetName: string]: string;
}

export const DEF_ASSETS_AUDIO = {
  // Player
  APlayerStep: "/audio/st1-footstep-sfx-323053.mp3", // https://pixabay.com/users/data_pion-49620193/
  APlayerHurt: "/audio/male_hurt7-48124.mp3", // https://pixabay.com/users/freesound_community-46691455/
  APlayerDie: "/audio/man-scream-121085.mp3", // https://pixabay.com/users/universfield-28281460/
  // Gun
  AGunRevolver: "/audio/gunfire-single-shot-colt-peacemaker-94951.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AGunShotgun: "/audio/shotgun-sound-effect-384451.mp3", // https://pixabay.com/users/ken_williams-32445584/
  AGunSMG: "/audio/22-caliber-with-ricochet-39679.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AGunRevolverReload: "/audio/clean-revolver-reload-6889.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AGunShotgunReload: "/audio/shotgun-reload-sfx-36524.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AGunSMGReload: "/audio/gunreload_9-92134.mp3", // https://pixabay.com/users/freesound_community-46691455/
  // Blocks
  ABlockWoodPlaced: "/audio/wood-block-105066.mp3", // https://pixabay.com/users/freesound_community-46691455/
  ABlockWoodDamaged: "/audio/wood-smash-1-170410.mp3", // https://pixabay.com/users/floraphonic-38928062/
  ABlockWoodDestroyed: "/audio/wood-smash-3-170418.mp3", // https://pixabay.com/users/floraphonic-38928062/
  // Zombies
  AZombieAttack: "/audio/zombie-bite-96528.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AZombieDeath: "/audio/small-monster-attack-195712.mp3", // https://pixabay.com/users/daviddumaisaudio-41768500/
  AZombieNoiseNormal: "/audio/zombie-15965.mp3", // https://pixabay.com/users/vilches86-12269887/
  AZombieNoiseNormal2: "/audio/zombie-choking-44937.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AZombieNoiseWandering: "/audio/growling-zombie-104988.mp3", // https://pixabay.com/users/freesound_community-46691455/
  AZombieNoiseAggressive: "/audio/monster_noise_2-105198.mp3", // https://pixabay.com/users/freesound_community-46691455/
  // FX
  AFXShopPurchase: "/audio/coin-donation-2-180438.mp3", // https://pixabay.com/users/floraphonic-38928062/
  AFXZombieAmbience: "/audio/zombie-sound-224167.mp3", // https://pixabay.com/users/alice_soundz-44907632/
  AFXCoinCollected: "/audio/drop-coin-384921.mp3", // https://pixabay.com/users/freesound_crunchpixstudio-49769582/
  AFXMorningRooster: "/audio/rooster-233738.mp3", // https://pixabay.com/users/stefan_grace-8153913/
  AFXUiClick: "/audio/computer-mouse-click-352734.mp3", // https://pixabay.com/users/universfield-28281460/
  // Music
  AMusicBackgroundNight: "/audio/horror-scary-dark-music-413504.mp3", // https://pixabay.com/users/lnplusmusic-47631836/
  AMusicBackgroundDay: "/audio/early-morning-muse-full-version-peaceful-flute-harp-strings-371629.mp3", // https://pixabay.com/users/kaazoom-448850/
  AMusicBackgroundDead: "/audio/sad-autumn-150145.mp3", // https://pixabay.com/users/music_for_videos-26992513/
} as const satisfies AssetDefinition;

export const DEF_ASSETS_IMAGE = {
  // Player
  SPlayerIdlePistol: "/images/player-pistol-idle.png",
  SPlayerReloadPistol: "/images/player-pistol-reload.png",
  SPlayerShootPistol: "/images/player-pistol-shoot.png",
  SPlayerWalkPistol: "/images/player-pistol-walk.png",
  SPlayerIdleShotgun: "/images/player-shotgun-idle.png",
  SPlayerReloadShotgun: "/images/player-shotgun-reload.png",
  SPlayerShootShotgun: "/images/player-shotgun-shoot.png",
  SPlayerWalkShotgun: "/images/player-shotgun-walk.png",
  SPlayerIdleSubmachine: "/images/player-rifle-idle.png",
  SPlayerReloadSubmachine: "/images/player-rifle-reload.png",
  SPlayerShootSubmachine: "/images/player-rifle-shoot.png",
  SPlayerWalkSubmachine: "/images/player-rifle-walk.png",
  SPlayerLegsWalk: "/images/player-legs-walk.png",
  IPlayerLegsIdle: "/images/player-legs-idle.png",

  IPlayerGunRevolver: "/images/survivor_pistol.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunShotgun: "/images/survivor_shotgun.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunRifle: "/images/survivor_rifle.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerGunSmg: "/images/survivor_smg.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  IPlayerUnarmed: "/images/survivor_unarmed.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  // Blocks
  IBlockWood: "/images/RTS_Crate.png",
  IBlockBarrel: "/images/barrel-png-20852.png",
  // Zombies
  IZombie1: "/images/zombie.png", // https://fightswithbears.itch.io/2d-topdown-survival-character
  SZombieMove: "/images/zombie-walk.png",
  SZombieAttack: "/images/zombie-attack.png",
  SZombieIdle: "/images/zombie-idle.png",
  // FX
  IFXBloodSplat: "/images/pi58p94iB.png", // https://www.clipartbest.com/clipart-pi58p94iB
  IFXBloodScreen: "/images/blood-png-7140.png", // https://www.freeiconspng.com/img/7140
  IFXBloodOverlay: "/images/blood-overlay.png",
  SFXBloodSplat: "/images/blood-spritesheet.png",
  // Textures
  ITextureGround: "/images/Texture_11_Diffuse.png", // https://oleekconder.itch.io/stylized-nature-textures
  // Shop
  ICoinSingle: "/images/coin-single.png",
  IShopRevolver: "/images/Revolver - Colt 45 [64x32].png", // https://arcadeisland.itch.io/guns-asset-pack-v1
  IShopShotgun: "/images/[32x96]Shotgun_V1.00.png", // https://arcadeisland.itch.io/guns-asset-pack-v1
  IShopSmg: "/images/Submachine - MP5A3 [80x48].png", // https://arcadeisland.itch.io/guns-asset-pack-v1
  // Spritesheets
  SCoin: "/images/coin-spritesheet.png", // https://www.kindpng.com/imgv/wobTmR_coins-clipart-sprite-animated-coin-sprite-sheet-hd/
  SFire: "/images/fire-spritesheet.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  // Tilesets
  TMapTilesetDemo: "/images/!CL_DEMO_48x48.png",
} as const satisfies AssetDefinition;

export type AssetAudioName = keyof typeof DEF_ASSETS_AUDIO;
export type AssetImageName = keyof typeof DEF_ASSETS_IMAGE;
export type AssetName = AssetAudioName | AssetImageName;
