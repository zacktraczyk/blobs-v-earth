import "./style.css";
import { Game } from "phaser";
import GameScene from "./game/scenes/GameScene";
import { GameService } from "./game/services/GameService";

// Generate a unique player ID
const playerId = `player_${Date.now()}_${Math.random()
  .toString(36)
  .substr(2, 9)}`;

const gameService = new GameService(playerId);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: GameScene,
};

const game = new Game(config);
