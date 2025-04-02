import "./style.css";
import { gameConfig } from "./game/config";
import "phaser";
import { TeamSelectionModal } from "./components/TeamSelectionModal";
import { GameService, Team } from "./game/services/GameService";

// Create game service
const gameService = new GameService();

// Create and export the game instance
export const game = new Phaser.Game(gameConfig);

// Show team selection modal
new TeamSelectionModal((team: Team) => {
  // Store the selected team in the game registry
  game.registry.set("playerTeam", team);

  // Start the game
  game.scene.start("GameScene");
});
