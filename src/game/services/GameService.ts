import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  serverTimestamp,
  update,
} from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export type Team = "earthling" | "blob";

export interface Player {
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  team: Team;
  lastUpdate: number;
  health: number;
  maxHealth: number;
}

export interface Projectile {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  team: Team;
  timestamp: number;
  lastUpdate: number;
}

export class GameService {
  private playerId: string;
  private gameStateRef: any;
  private playerRef: any;
  private projectilesRef: any;
  private onGameStateUpdateCallback: ((state: any) => void) | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / 60; // 60 FPS

  constructor(playerId: string) {
    this.playerId = playerId;
    this.gameStateRef = ref(database, "gameState");
    this.playerRef = ref(database, `gameState/players/${playerId}`);
    this.projectilesRef = ref(database, "gameState/projectiles");
  }

  joinGame(team: Team) {
    set(this.playerRef, {
      x: Math.random() * 800,
      y: Math.random() * 600,
      rotation: 0,
      velocityX: 0,
      velocityY: 0,
      team,
      lastUpdate: serverTimestamp(),
      health: 100,
      maxHealth: 100,
    });
  }

  leaveGame() {
    remove(this.playerRef);
  }

  startGame() {
    set(ref(database, "gameState/gameStarted"), true);
  }

  updatePlayerState(
    x: number,
    y: number,
    rotation: number,
    velocityX: number,
    velocityY: number
  ) {
    set(this.playerRef, {
      x,
      y,
      rotation,
      velocityX,
      velocityY,
      lastUpdate: serverTimestamp(),
    });
  }

  fireProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    team: Team
  ) {
    const projectileRef = push(this.projectilesRef);
    set(projectileRef, {
      x,
      y,
      angle,
      speed,
      damage,
      team,
      timestamp: serverTimestamp(),
      lastUpdate: serverTimestamp(),
    });
  }

  updateProjectilePosition(projectileId: string, x: number, y: number) {
    const projectileRef = ref(
      database,
      `gameState/projectiles/${projectileId}`
    );
    update(projectileRef, {
      x,
      y,
      lastUpdate: serverTimestamp(),
    });
  }

  onGameStateUpdate(callback: (state: any) => void) {
    this.onGameStateUpdateCallback = callback;
    onValue(this.gameStateRef, (snapshot) => {
      const state = snapshot.val();
      if (this.onGameStateUpdateCallback) {
        this.onGameStateUpdateCallback(state);
      }
    });
  }

  updatePlayerHealth(health: number) {
    set(this.playerRef, {
      health,
      lastUpdate: serverTimestamp(),
    });
  }

  updateOtherPlayerHealth(playerId: string, health: number) {
    const playerRef = ref(database, `gameState/players/${playerId}`);
    set(playerRef, {
      health,
      lastUpdate: serverTimestamp(),
    });
  }

  getPlayerData(playerId: string): Player | null {
    const playerRef = ref(database, `gameState/players/${playerId}`);
    let playerData: Player | null = null;

    onValue(
      playerRef,
      (snapshot) => {
        playerData = snapshot.val();
      },
      { onlyOnce: true }
    );

    return playerData;
  }
}
