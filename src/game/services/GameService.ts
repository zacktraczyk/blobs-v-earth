import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export interface GameState {
  players: {
    [key: string]: {
      x: number;
      y: number;
      team: "red" | "blue";
      score: number;
    };
  };
  projectiles: {
    [key: string]: {
      x: number;
      y: number;
      angle: number;
      team: "red" | "blue";
    };
  };
  invaders: {
    [key: string]: {
      x: number;
      y: number;
      health: number;
    };
  };
}

export class GameService {
  private gameRef = ref(database, "game");
  private playerRef: any;
  private playerId: string;
  private team: "red" | "blue";
  private score: number = 0;

  constructor(playerId: string) {
    this.playerId = playerId;
    this.playerRef = ref(database, `game/players/${playerId}`);
  }

  async initializeGame(): Promise<void> {
    const initialState: GameState = {
      players: {},
      projectiles: {},
      invaders: {},
    };
    await set(this.gameRef, initialState);
  }

  async joinGame(team: "red" | "blue"): Promise<void> {
    this.team = team;
    const player = {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      team,
      score: 0,
    };
    await set(this.playerRef, player);
  }

  async updatePlayerPosition(x: number, y: number): Promise<void> {
    const player = {
      x,
      y,
      team: this.team,
      score: this.score,
    };
    await set(this.playerRef, player);
  }

  async fireProjectile(x: number, y: number, angle: number): Promise<void> {
    const projectileId = `projectile_${Date.now()}`;
    const projectileRef = ref(database, `game/projectiles/${projectileId}`);
    await set(projectileRef, { x, y, angle, team: this.team });
  }

  async spawnInvader(x: number, y: number): Promise<void> {
    const invaderId = `invader_${Date.now()}`;
    const invaderRef = ref(database, `game/invaders/${invaderId}`);
    await set(invaderRef, { x, y, health: 100 });
  }

  async updateInvaderHealth(invaderId: string, health: number): Promise<void> {
    const invaderRef = ref(database, `game/invaders/${invaderId}`);
    await set(invaderRef, { health });
  }

  async removeProjectile(projectileId: string): Promise<void> {
    const projectileRef = ref(database, `game/projectiles/${projectileId}`);
    await set(projectileRef, null);
  }

  async removeInvader(invaderId: string): Promise<void> {
    const invaderRef = ref(database, `game/invaders/${invaderId}`);
    await set(invaderRef, null);
  }

  onGameStateUpdate(callback: (state: GameState) => void): () => void {
    return onValue(this.gameRef, (snapshot) => {
      const state = snapshot.val() as GameState;
      callback(state);
    });
  }
}
