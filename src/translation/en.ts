const enTranslation = {
  mainMenu: {
    playGame: "Play game",
    settings: "Settings",
    mapEditor: "Map editor",
    fullscreen: "Full screen",
    appName: "Zomblocks",
  },
  menuSettings: {
    title: "Settings",
    touchControlsEnabled: "Touch controls enabled",
    volume: "Volume",
    music: "Music",
    effects: "Sound effects",
  },
  hud: {
    day: "Day",
    youDied: "You died!",
    sleepUntilNight: "Sleep until night",
    openBuildMenu: "Open Build menu",
    closeBuildMenu: "Close Build menu",
    goodMorning: "Good morning!",
    goodMorningDesc: (day: number) => `Day ${day} is starting.`,
  },
  pause: {
    title: "The game is paused",
    resume: "Continue",
    exit: "Exit",
  },
  gameOver: {
    title: "You are dead...",
    subtitle: "Finally, peace.",
    survivedDays: (n: number) => `You survived ${n} days`,
    killedZombies: (n: number) => `You killed ${n} zombies`,
    backToMenu: "Back to Menu",
  },
  shop: {
    openShop: "Open shop",
    pressNToOpen: (n: string) => `Press ${n} to open shop`,
    touchToOpen: "Touch to open",
    title: "Survivor shop",
    titleResources: "Resources",
    titleWeapons: "Guns",
    titleAmmo: "Ammo",
    titleWoodBlock: "Wooden block",
    titleRevolver: "Revolver",
    titleShotgun: "Shotgun",
    titleSMG: "Submachine gun",
    titleHealthPack: "First-aid kit",

    cost: "Cost",
    yourStock: "Your stock",
    close: "Close",
    cancel: "Cancel",
    purchase: "Purchase",
    confirmationPrompt: (name: string, cost: number) => `Purchase ${name} for ${cost}?`,
  },
};

export type TranslationDictionary = typeof enTranslation;

export default enTranslation;
