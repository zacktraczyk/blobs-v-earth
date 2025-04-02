import {
  ref,
  onValue,
  set,
  push,
  remove,
  serverTimestamp,
} from "firebase/database";
import { database } from "../../firebase/config";

export type Team = "blob" | "earthling";

export interface Player {
  id: string;
  x: number;
  y: number;
  rotation: number;
  team: Team;
  lastUpdate: number;
}

export interface GameState {
  players: { [key: string]: Player };
  earth: {
    health: number;
    x: number;
    y: number;
  };
}

export class GameService {
  private gameStateRef = ref(database, "gameState");
  private playerRef: any = null;
  private currentPlayerId: string | null = null;

  constructor() {
    // Listen for game state changes
    onValue(this.gameStateRef, (snapshot) => {
      const gameState = snapshot.val() as GameState;
      if (gameState) {
        this.onGameStateUpdate(gameState);
      }
    });
  }

  public joinGame(team: Team, x: number, y: number): string {
    // Create a new player entry
    const newPlayerRef = push(ref(database, "gameState/players"));
    this.currentPlayerId = newPlayerRef.key!;
    this.playerRef = newPlayerRef;

    // Set initial player data
    const player: Player = {
      id: this.currentPlayerId,
      x,
      y,
      rotation: 0,
      team,
      lastUpdate: Date.now(),
    };

    set(newPlayerRef, player);

    return this.currentPlayerId;
  }

  public updatePlayerPosition(x: number, y: number, rotation: number) {
    if (!this.playerRef) return;

    const player: Partial<Player> = {
      x,
      y,
      rotation,
      lastUpdate: Date.now(),
    };

    set(this.playerRef, player, true);
  }

  public shootProjectile(x: number, y: number, angle: number, team: Team) {
    const projectileRef = push(ref(database, "gameState/projectiles"));
    set(projectileRef, {
      x,
      y,
      angle,
      team,
      timestamp: serverTimestamp(),
    });
  }

  public leaveGame() {
    if (this.playerRef) {
      remove(this.playerRef);
      this.playerRef = null;
      this.currentPlayerId = null;
    }
  }

  private onGameStateUpdate(gameState: GameState) {
    // This will be implemented in the GameScene
    // to handle updates from other players
  }
}
