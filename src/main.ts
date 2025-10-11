import GameInstance from "./GameInstance";
import "./style.css";

const game = new GameInstance();
game.init();

export const gameInstance = game;
