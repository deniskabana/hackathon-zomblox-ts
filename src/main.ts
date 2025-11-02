import "./style.css";
import csTranslation from "./translation/cs";
import enTranslation from "./translation/en";
import GameInstance from "./GameInstance";
import type { Translation } from "./types/Translation";

(function () {
  const game = new GameInstance();
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

  const submitButton = document.getElementById("launch-game");

  async function launchGame() {
    document.getElementById("pregame")?.classList.add("hidden");
    await game.init();
    game.startGame();
  }

  if (submitButton) {
    submitButton.addEventListener("click", launchGame);
    submitButton.addEventListener("touchend", launchGame);
  }
})();
