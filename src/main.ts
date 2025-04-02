import "./style.css";
import { gameConfig } from "./game/config";
import "phaser";

// Create and export the game instance
export const game = new Phaser.Game(gameConfig);
