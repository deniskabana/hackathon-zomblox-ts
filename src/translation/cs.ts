import type { TranslationDictionary } from "./en";

const csTranslation: TranslationDictionary = {
  mainMenu: {
    playGame: "Hrát hru",
    settings: "Nastavení",
    mapEditor: "Editor mapy",
    fullscreen: "Celá obrazovka",
    appName: "Zomblocks",
  },
  menuSettings: {
    title: "Nastavení",
    touchControlsEnabled: "Dotykové ovládání zapnuto",
    volume: "Hlasitost",
    music: "Hudba",
    effects: "Zvukové efekty",
  },
  hud: {
    day: "Den",
    youDied: "Zemřel jsi!",
    sleep: "Spát do noci",
    goodMorning: "Dobré ráno!",
    goodMorningDesc: (day: number) => `Začíná ${day}. den.`,
  },
  pause: {
    title: "Hra je pozastavena",
    resume: "Pokračovat",
    exit: "Ukončit",
  },
  gameOver: {
    title: "Jsi mrtvý...",
    subtitle: "Konečně klid.",
    survivedDays: (n: number) => `Přežil jsi ${n} dní`,
    killedZombies: (n: number) => `Zabil jsi ${n} zombie`,
    backToMenu: "Zpět do menu",
  },
  shop: {
    openShop: "Otevřít obchod",
    pressNToOpen: (n: string) => `Stiskni ${n} pro otevření obchodu`,
    touchToOpen: "Dotkni se pro otevření",
    title: "Obchod přeživšího",
    titleResources: "Zdroje",
    titleWeapons: "Zbraně",
    titleAmmo: "Munice",
    titleWoodBlock: "Dřevěný blok",
    titleRevolver: "Revolver",
    titleShotgun: "Brokovnice",
    titleSMG: "Samopal",
    titleHealthPack: "Lékárnička",
    cost: "Cena",
    yourStock: "Tvá zásoba",
    close: "Zavřít",
    cancel: "Zrušit",
    purchase: "Koupit",
    confirmationPrompt: (name: string, cost: number) => `Koupit ${name} za ${cost}?`,
  },
};

export default csTranslation;
