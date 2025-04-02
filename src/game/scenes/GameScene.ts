import Phaser from "phaser";
import { GameService, Player, Projectile, Team } from "../services/GameService";
import { TeamSelectionModal } from "../../components/TeamSelectionModal";

export default class GameScene extends Phaser.Scene {
  private gameService: GameService;
  private player: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private projectiles: Map<string, Phaser.Physics.Arcade.Sprite>;
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite>;
  private playerId: string;
  private team: Team;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / 60; // 60 FPS
  private gameSpeed: number = 200;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private showTeamSelection: boolean = true;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load game assets
    this.load.image("player", "assets/player.png");
    this.load.image("blob", "assets/blob.png");
    this.load.image("projectile", "assets/projectile.png");
    this.load.image("background", "assets/background.png");
  }

  create() {
    // Add background
    const background = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      "background"
    );
    background.setOrigin(0, 0);

    // Generate a unique player ID if not already set
    this.playerId = `player_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.gameService = new GameService(this.playerId);

    // Initialize game state
    this.otherPlayers = new Map();
    this.projectiles = new Map();

    // Set up input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Create player sprite (will be updated after team selection)
    this.player = this.physics.add.sprite(400, 300, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setOrigin(0.5, 0.5);
    this.player.setScale(0.5);
    this.player.setVisible(false); // Hide until team is selected

    // Set up physics
    this.physics.world.setBounds(0, 0, window.innerWidth, window.innerHeight);

    // Listen for game state updates
    this.gameService.onGameStateUpdate((state) => {
      this.handleGameStateUpdate(state);
    });

    // Handle window resize
    this.scale.on("resize", this.resize, this);

    // Show team selection modal
    this.showTeamSelectionModal();
  }

  private showTeamSelectionModal() {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    modal.style.padding = "20px";
    modal.style.borderRadius = "10px";
    modal.style.color = "white";
    modal.style.textAlign = "center";
    modal.style.zIndex = "1000";

    const title = document.createElement("h2");
    title.textContent = "Choose Your Team";
    modal.appendChild(title);

    const earthlingButton = document.createElement("button");
    earthlingButton.textContent = "Earthling";
    earthlingButton.style.margin = "10px";
    earthlingButton.style.padding = "10px 20px";
    earthlingButton.style.backgroundColor = "#4B79A1";
    earthlingButton.style.border = "none";
    earthlingButton.style.borderRadius = "5px";
    earthlingButton.style.color = "white";
    earthlingButton.style.cursor = "pointer";
    earthlingButton.onclick = () => this.handleTeamSelect("earthling");

    const blobButton = document.createElement("button");
    blobButton.textContent = "Blob";
    blobButton.style.margin = "10px";
    blobButton.style.padding = "10px 20px";
    blobButton.style.backgroundColor = "#27AE60";
    blobButton.style.border = "none";
    blobButton.style.borderRadius = "5px";
    blobButton.style.color = "white";
    blobButton.style.cursor = "pointer";
    blobButton.onclick = () => this.handleTeamSelect("blob");

    modal.appendChild(earthlingButton);
    modal.appendChild(blobButton);
    document.body.appendChild(modal);
  }

  private handleTeamSelect(team: Team) {
    this.team = team;
    this.showTeamSelection = false;

    // Update player appearance based on team
    this.player.setTexture(team === "earthling" ? "player" : "blob");
    this.player.setVisible(true);
    this.player.setTint(team === "earthling" ? 0x4b79a1 : 0x27ae60);

    // Join game with selected team
    this.gameService.joinGame(team);
    this.gameService.startGame();

    // Remove the modal
    const modal = document.querySelector("div[style*='z-index: 1000']");
    if (modal) {
      modal.remove();
    }
  }

  private resize(gameSize: Phaser.Structs.Size) {
    // Update background
    const background = this.children.list.find(
      (child) => child instanceof Phaser.GameObjects.TileSprite
    ) as Phaser.GameObjects.TileSprite;
    if (background) {
      background.setSize(gameSize.width, gameSize.height);
    }

    // Update world bounds
    this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);
  }

  private handleGameStateUpdate(state: any) {
    // Update other players
    Object.entries(state.players || {}).forEach(([id, playerData]) => {
      if (id !== this.playerId) {
        this.updateOtherPlayer(id, playerData as Player);
      }
    });

    // Update projectiles
    Object.entries(state.projectiles || {}).forEach(([id, projectileData]) => {
      this.updateProjectile(id, projectileData as Projectile);
    });
  }

  private updateOtherPlayer(id: string, playerData: Player) {
    let otherPlayer = this.otherPlayers.get(id);
    if (!otherPlayer) {
      otherPlayer = this.physics.add.sprite(
        playerData.x,
        playerData.y,
        playerData.team === "earthling" ? "player" : "blob"
      );
      otherPlayer.setTint(
        playerData.team === "earthling" ? 0x4b79a1 : 0x27ae60
      );
      otherPlayer.setOrigin(0.5, 0.5);
      otherPlayer.setScale(0.5);
      this.otherPlayers.set(id, otherPlayer);
    } else {
      otherPlayer.setPosition(playerData.x, playerData.y);
      otherPlayer.setRotation(playerData.rotation);
    }
  }

  private updateProjectile(id: string, projectileData: Projectile) {
    let projectile = this.projectiles.get(id);
    if (!projectile) {
      projectile = this.physics.add.sprite(
        projectileData.x,
        projectileData.y,
        "projectile"
      );
      projectile.setTint(
        projectileData.team === "earthling" ? 0x4b79a1 : 0x27ae60
      );
      projectile.setOrigin(0.5, 0.5);
      projectile.setScale(0.3);
      this.projectiles.set(id, projectile);
    } else {
      projectile.setPosition(projectileData.x, projectileData.y);
      projectile.setRotation(projectileData.angle);
    }
  }

  update() {
    if (this.showTeamSelection) return;

    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;

    // Handle player movement with WASD
    if (this.wasd.A.isDown) {
      this.player.setVelocityX(-this.gameSpeed);
    } else if (this.wasd.D.isDown) {
      this.player.setVelocityX(this.gameSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.wasd.W.isDown) {
      this.player.setVelocityY(-this.gameSpeed);
    } else if (this.wasd.S.isDown) {
      this.player.setVelocityY(this.gameSpeed);
    } else {
      this.player.setVelocityY(0);
    }

    // Calculate rotation based on mouse position
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.x,
      pointer.y
    );
    this.player.setRotation(angle);

    // Update player state in Firebase
    this.gameService.updatePlayerState(
      this.player.x,
      this.player.y,
      this.player.rotation,
      this.player.body.velocity.x,
      this.player.body.velocity.y
    );

    // Handle shooting
    if (pointer.isDown) {
      this.shoot();
    }

    this.lastUpdateTime = now;
  }

  private shoot() {
    const projectileSpeed = 400;
    const angle = this.player.rotation;
    const spawnOffset = 30; // Spawn projectile at the front of the player
    const spawnX = this.player.x + Math.cos(angle) * spawnOffset;
    const spawnY = this.player.y + Math.sin(angle) * spawnOffset;

    this.gameService.fireProjectile(spawnX, spawnY, angle, projectileSpeed, 10);
  }

  shutdown() {
    this.gameService.leaveGame();
  }
}
