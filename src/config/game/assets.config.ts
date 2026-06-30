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
  AZombieSquish: "/audio/floraphonic-slime-splat-with-drips-2-219262.mp3", // https://pixabay.com/users/floraphonic-38928062/
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
  SPlayerRun: "/images/player/Player_run.png",
  SPlayerIdle: "/images/player/Player_idle.png",
  SPlayerHit: "/images/player/Player_hit.png",
  SPlayerDeath: "/images/player/Player_death.png",
  SPlayerKnocked: "/images/player/Player_knocked.png",
  // Player spritesheets
  SPlayerWeapons: "/images/player/Weapons sprites (32x32).png",
  // Zombies
  SZombie1Run: "/images/zombie/Zombie1/Zombie_run.png",
  SZombie1Idle: "/images/zombie/Zombie1/Zombie_Idle.png",
  SZombie1Hit: "/images/zombie/Zombie1/Zombie_Hit.png",
  SZombie1Death: "/images/zombie/Zombie1/Zombie_Death 1.png",
  SZombie1DeathAlt: "/images/zombie/Zombie1/Zombie_Death 2 .png",
  SZombie1Knocked: "/images/zombie/Zombie1/Zombie_knocked .png",
  SZombie2Run: "/images/zombie/Zombie2/Zombie 2_Run.png",
  SZombie2Idle: "/images/zombie/Zombie2/Zombie 2_Idle.png",
  SZombie2Hit: "/images/zombie/Zombie2/Zombie 2_Hit.png",
  SZombie2Death: "/images/zombie/Zombie2/Zombie 2_Death 1 .png",
  SZombie2DeathAlt: "/images/zombie/Zombie2/Zombie 2_ Death 2 .png",
  SZombie2Knocked: "/images/zombie/Zombie2/Zombie 2_knocked.png",
  SZombie3Run: "/images/zombie/Zombie3/Zombie 3_run .png",
  SZombie3Idle: "/images/zombie/Zombie3/Zombie 3_idle .png",
  SZombie3Hit: "/images/zombie/Zombie3/Zombie 3_Hit .png",
  SZombie3Death: "/images/zombie/Zombie3/Zombie 3_death.png",
  SZombie3Knocked: "/images/zombie/Zombie3/Zombie 3_knocked .png",
  SZombie4Run: "/images/zombie/Zombie4/Zombie 4_run.png",
  SZombie4Idle: "/images/zombie/Zombie4/Zombie 4_idle.png",
  SZombie4Hit: "/images/zombie/Zombie4/Zombie 4_hit.png",
  SZombie4Death: "/images/zombie/Zombie4/Zombie 4_death 4.png",
  SZombie4Knocked: "/images/zombie/Zombie4/Zombie 4_knocked .png",
  // Blocks
  IBlockWood: "/images/RTS_Crate.png",
  IBlockBarrel: "/images/barrel-png-20852.png",
  // FX
  IFXBloodSplat: "/images/pi58p94iB.png", // https://www.clipartbest.com/clipart-pi58p94iB
  IFXBloodScreen: "/images/blood-png-7140.png", // https://www.freeiconspng.com/img/7140
  IFXBloodOverlay: "/images/blood-overlay.png",
  SFXBloodSplat: "/images/blood-spritesheet-32x32.png",
  IFXEntityShadow: "/images/entity-shadow.png",
  IFXAttackSlash: "/images/slash-effect5.png", // https://opengameart.org/content/weapon-slash-effect
  IFXAnimFire1: "/images/fx/anim_fire_1.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  IFXAnimFire2: "/images/fx/anim_fire_2.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  IFXAnimFire3: "/images/fx/anim_fire_3.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  IFXAnimFire4: "/images/fx/anim_fire_4.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  // Shop
  ICoinSingle: "/images/coin-single.png",
  IShopMedkit: "/images/medkit.png",
  // Spritesheets
  SCoin: "/images/coin-spritesheet.png", // https://www.kindpng.com/imgv/wobTmR_coins-clipart-sprite-animated-coin-sprite-sheet-hd/
  SFire: "/images/fire-spritesheet.png", // https://devkidd.itch.io/pixel-fire-asset-pack-2
  // Tilesets
  TMapTilesetDemo: "/images/!CL_DEMO_48x48.png",
  // UI
  UIActionBubble: "/images/ui/action-bubble.png",
  UIInteractionGreenAnim: "/images/ui/interactive-hl-green.png", // https://bdragon1727.itch.io/basic-pixel-health-bar-and-scroll-bar
  UIInteractionOrangeAnim: "/images/ui/interactive-hl-orange.png", // https://bdragon1727.itch.io/basic-pixel-health-bar-and-scroll-bar
  UIHealthBars: "/images/ui/ui-health-bars.png", // https://bdragon1727.itch.io/basic-pixel-health-bar-and-scroll-bar
  UILoadersMarkers: "/images/ui/ui-loaders-markers.png", // https://bdragon1727.itch.io/basic-pixel-health-bar-and-scroll-bar
  UIHighlightObj: "/images/ui/ui-higlight.png", // https://crusenho.itch.io/complete-ui-essential-pack
  UIHighlightObjPositive: "/images/ui/ui-higlight-positive.png",
  UIHighlightObjNegative: "/images/ui/ui-higlight-negative.png",
  UIControlPanelBg: "/images/ui/hud/control-panel-bg.png",
  UIControlPanelBtnBig: "/images/ui/hud/control-panel-btn-big.png",
  UIControlPanelBtnBigDisabled: "/images/ui/hud/control-panel-btn-big-disabled.png",
  UIControlPanelBtnSmall: "/images/ui/hud/control-panel-btn-small.png",

  // Icons
  SIcoWarfare: "/images/icons/Icons_Warfare.png", // https://nikoichu.itch.io/pixel-icons
  SIcoToolsCrafting: "/images/icons/Icons_Tools_Crafting.png", // https://nikoichu.itch.io/pixel-icons
} as const satisfies AssetDefinition;

export type AssetAudioName = keyof typeof DEF_ASSETS_AUDIO;
export type AssetImageName = keyof typeof DEF_ASSETS_IMAGE;
export type AssetName = AssetAudioName | AssetImageName;
