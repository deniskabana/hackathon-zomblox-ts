import "./style.css";
import csTranslation from "./translation/cs";
import enTranslation from "./translation/en";
import GameInstance from "./GameInstance";
import type { Translation } from "./types/Translation";

(function () {
  const game = new GameInstance();
  game.canvas.classList.add("hidden");

  // Translations
  // ==================================================

  let dictionary: Translation["dictionary"];

  function applyTranslation(lang: string = "en") {
    localStorage.setItem("language", lang ?? "");
    const translatedElements = document.querySelectorAll<HTMLElement>("[data-tkey]");

    switch (lang) {
      case "cs":
        dictionary = csTranslation;
        break;
      case "en":
        dictionary = enTranslation;
        break;
      default:
        return;
    }

    for (const element of translatedElements) {
      const tKey = element.dataset["tkey"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (tKey) element.innerText = (dictionary as any)[tKey];
    }

    const allButtons = document.querySelectorAll<HTMLElement>("[data-language]");
    for (const button of allButtons) {
      button.classList.remove("active");
      if (button.dataset["language"] === lang) button.classList.add("active");
    }
  }

  const preferredTranslation = localStorage.getItem("language");
  const systemTranslation = navigator.language.slice(0, 2);
  applyTranslation(preferredTranslation || systemTranslation || "en");

  const languageButtons = document.querySelectorAll<HTMLElement>("[data-language]");
  if (languageButtons) {
    for (const button of languageButtons) {
      const language = button.dataset["language"];
      const eventHandler = () => applyTranslation(language);
      button.addEventListener("click", eventHandler);
      button.addEventListener("touchend", eventHandler);
    }
  }

  // Volume sliders
  // ==================================================

  const volumeSliders = document.querySelectorAll<HTMLInputElement>("input.pregame-menu__volume-slider");
  for (const slider of volumeSliders) {
    const max = parseInt(slider.max);
    const type = (slider.dataset["volume"] || "master") as "master" | "music" | "effects";
    slider.value = String((game.MANAGERS.GameManager.getSettings().volume[type] ?? 1) * max);
    slider.addEventListener("change", () => {
      const inputValue = parseInt(slider.value);
      const value = inputValue / max;
      game.MANAGERS.GameManager.setSettings({ volume: { [type]: value } });
    });
  }

  // Fullscreen button
  // ==================================================

  const fullscreenButton = document.querySelector<HTMLButtonElement>("button.pregame-menu__fullscreen-btn");
  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", () => {
      if (document.fullscreenElement === document.body) document.exitFullscreen();
      else document.body.requestFullscreen();
    });
  }

  // Launch game
  // ==================================================

  const submitButton = document.getElementById("launch-game");

  async function launchGame() {
    document.getElementById("pregame")?.classList.add("hidden");
    game.canvas.classList.remove("hidden");
    await game.init();
    game.startGame();
  }

  if (submitButton) {
    submitButton.addEventListener("click", launchGame);
  }
})();
