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
  private spaceKey: Phaser.Input.Keyboard.Key;
  private showTeamSelection: boolean = true;
  private lastProjectileUpdate: number = 0;
  private projectileUpdateInterval: number = 1000 / 60; // 60 FPS
  private lastShootTime: number = 0;
  private shootCooldown: number = 250; // 250ms between shots
  private shootEffect: Phaser.GameObjects.Particles.ParticleEmitter;
  private shootSound: Phaser.Sound.BaseSound;
  private hitSound: Phaser.Sound.BaseSound;
  private healthBar: Phaser.GameObjects.Graphics;
  private playerHealth: number = 100;
  private maxHealth: number = 100;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load game assets
    this.load.image("player", "assets/player.png");
    this.load.image("blob", "assets/invader.png");
    this.load.image("projectile", "assets/projectile.png");
    this.load.image("background", "assets/Earth background.png");

    // Load sound effects
    this.load.audio("shoot", "assets/sounds/shoot.mp3");
    this.load.audio("hit", "assets/sounds/hit.mp3");
  }

  create() {
    // Add background
    const background = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      "background"
    );
    background.setOrigin(0.5, 0.5);

    // Scale background to cover the screen while maintaining aspect ratio
    const scaleX = this.scale.width / background.width;
    const scaleY = this.scale.height / background.height;
    const scale = Math.max(scaleX, scaleY);
    background.setScale(scale);

    // Add reset button
    const resetButton = document.createElement("button");
    resetButton.textContent = "Reset Game";
    resetButton.style.position = "fixed";
    resetButton.style.top = "20px";
    resetButton.style.right = "20px";
    resetButton.style.padding = "10px 20px";
    resetButton.style.backgroundColor = "#ff4444";
    resetButton.style.border = "none";
    resetButton.style.borderRadius = "5px";
    resetButton.style.color = "white";
    resetButton.style.cursor = "pointer";
    resetButton.style.fontSize = "16px";
    resetButton.style.zIndex = "1000";
    resetButton.onclick = () => this.handleReset();
    document.body.appendChild(resetButton);

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
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

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

    // Initialize sound effects
    this.shootSound = this.sound.add("shoot");
    this.hitSound = this.sound.add("hit");

    // Create particle effect for shooting
    const particles = this.add.particles(0, 0, "projectile", {
      speed: 100,
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 200,
      quantity: 5,
      blendMode: "ADD",
    });
    particles.stop();
    this.shootEffect = particles;

    // Create health bar
    this.healthBar = this.add.graphics();
    this.updateHealthBar();
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
      (child) => child instanceof Phaser.GameObjects.Image
    ) as Phaser.GameObjects.Image;
    if (background) {
      background.setPosition(gameSize.width / 2, gameSize.height / 2);
      const scaleX = gameSize.width / background.width;
      const scaleY = gameSize.height / background.height;
      const scale = Math.max(scaleX, scaleY);
      background.setScale(scale);
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

      // Add health bar for other player
      const healthBar = this.add.graphics();
      otherPlayer.setData("healthBar", healthBar);
      this.updateOtherPlayerHealthBar(
        id,
        playerData.health,
        playerData.maxHealth
      );
    } else {
      otherPlayer.setPosition(playerData.x, playerData.y);
      otherPlayer.setRotation(playerData.rotation);
      this.updateOtherPlayerHealthBar(
        id,
        playerData.health,
        playerData.maxHealth
      );
    }
  }

  private updateOtherPlayerHealthBar(
    id: string,
    health: number,
    maxHealth: number
  ) {
    const otherPlayer = this.otherPlayers.get(id);
    if (!otherPlayer) return;

    const healthBar = otherPlayer.getData(
      "healthBar"
    ) as Phaser.GameObjects.Graphics;
    if (!healthBar) return;

    healthBar.clear();

    // Background (red)
    healthBar.fillStyle(0xff0000, 0.5);
    healthBar.fillRect(otherPlayer.x - 25, otherPlayer.y - 40, 50, 5);

    // Health (green)
    healthBar.fillStyle(0x00ff00, 0.5);
    healthBar.fillRect(
      otherPlayer.x - 25,
      otherPlayer.y - 40,
      (health / maxHealth) * 50,
      5
    );
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

      // Add collision detection
      this.physics.add.overlap(
        projectile,
        this.player,
        this.handleProjectileHit,
        undefined,
        this
      );

      // Add collision with other players
      this.otherPlayers.forEach((otherPlayer) => {
        this.physics.add.overlap(
          projectile,
          otherPlayer,
          this.handleProjectileHit,
          undefined,
          this
        );
      });
    } else {
      // Update position based on velocity and time
      const now = Date.now();
      const deltaTime = (now - projectileData.lastUpdate) / 1000;
      const distance = projectileData.speed * deltaTime;

      const newX = projectileData.x + Math.cos(projectileData.angle) * distance;
      const newY = projectileData.y + Math.sin(projectileData.angle) * distance;

      // Update the projectile position
      projectile.setPosition(newX, newY);
      projectile.setRotation(projectileData.angle);

      // Update Firebase with new position
      this.gameService.updateProjectilePosition(id, newX, newY);

      // Remove projectile if it's out of bounds
      if (
        newX < 0 ||
        newX > this.scale.width ||
        newY < 0 ||
        newY > this.scale.height
      ) {
        projectile.destroy();
        this.projectiles.delete(id);
      }
    }
  }

  private handleProjectileHit(
    projectile: Phaser.Physics.Arcade.Sprite,
    target: Phaser.Physics.Arcade.Sprite
  ) {
    // Play hit sound
    this.hitSound.play();

    // Create hit effect
    const hitEffect = this.add.particles(0, 0, "projectile", {
      x: target.x,
      y: target.y,
      speed: 50,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      quantity: 8,
      blendMode: "ADD",
    });

    // Remove hit effect after animation
    this.time.delayedCall(300, () => {
      hitEffect.destroy();
    });

    // Handle damage
    if (target === this.player) {
      this.playerHealth -= 10;
      this.updateHealthBar();
      this.gameService.updatePlayerHealth(this.playerHealth);

      // Check for player death
      if (this.playerHealth <= 0) {
        this.handlePlayerDeath();
      }
    } else {
      // Handle damage to other players
      const playerId = Object.keys(this.otherPlayers).find(
        (id) => this.otherPlayers.get(id) === target
      );
      if (playerId) {
        const playerData = this.gameService.getPlayerData(playerId);
        if (playerData) {
          const newHealth = Math.max(0, playerData.health - 10);
          this.gameService.updateOtherPlayerHealth(playerId, newHealth);
        }
      }
    }

    // Remove projectile
    projectile.destroy();
    this.projectiles.delete(projectile.texture.key);
  }

  private handlePlayerDeath() {
    // Show death effect
    const deathEffect = this.add.particles(0, 0, "projectile", {
      x: this.player.x,
      y: this.player.y,
      speed: 100,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 20,
      blendMode: "ADD",
    });

    // Hide player
    this.player.setVisible(false);
    this.healthBar.setVisible(false);

    // Show respawn message
    const respawnText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        "Press SPACE to respawn",
        {
          fontSize: "32px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5);

    // Listen for respawn
    const respawnHandler = () => {
      this.playerHealth = this.maxHealth;
      this.player.setPosition(
        Math.random() * this.scale.width,
        Math.random() * this.scale.height
      );
      this.player.setVisible(true);
      this.healthBar.setVisible(true);
      this.updateHealthBar();
      this.gameService.updatePlayerHealth(this.playerHealth);
      respawnText.destroy();
      this.input.keyboard.removeListener("keydown-SPACE", respawnHandler);
    };

    this.input.keyboard.on("keydown-SPACE", respawnHandler);
  }

  private updateHealthBar() {
    this.healthBar.clear();

    // Background (red)
    this.healthBar.fillStyle(0xff0000, 0.5);
    this.healthBar.fillRect(this.player.x - 25, this.player.y - 40, 50, 5);

    // Health (green)
    this.healthBar.fillStyle(0x00ff00, 0.5);
    this.healthBar.fillRect(
      this.player.x - 25,
      this.player.y - 40,
      (this.playerHealth / this.maxHealth) * 50,
      5
    );
  }

  update() {
    if (this.showTeamSelection) return;

    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;

    // Handle player movement with WASD
    let velocityX = 0;
    let velocityY = 0;

    if (this.wasd.A.isDown) {
      velocityX = -this.gameSpeed;
    } else if (this.wasd.D.isDown) {
      velocityX = this.gameSpeed;
    }

    if (this.wasd.W.isDown) {
      velocityY = -this.gameSpeed;
    } else if (this.wasd.S.isDown) {
      velocityY = this.gameSpeed;
    }

    // Apply velocity to player
    this.player.setVelocity(velocityX, velocityY);

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
      velocityX,
      velocityY
    );

    // Handle shooting with space key
    if (this.spaceKey.isDown) {
      this.shoot();
    }

    // Update health bar position
    this.updateHealthBar();

    this.lastUpdateTime = now;
  }

  private shoot() {
    const now = Date.now();
    if (now - this.lastShootTime < this.shootCooldown) return;

    const projectileSpeed = 400;
    const angle = this.player.rotation;
    const spawnOffset = 30;
    const spawnX = this.player.x + Math.cos(angle) * spawnOffset;
    const spawnY = this.player.y + Math.sin(angle) * spawnOffset;

    // Play shoot sound
    this.shootSound.play();

    // Show particle effect
    this.shootEffect.setPosition(spawnX, spawnY);
    this.shootEffect.setAngle(angle * (180 / Math.PI));
    this.shootEffect.start();

    this.gameService.fireProjectile(
      spawnX,
      spawnY,
      angle,
      projectileSpeed,
      10,
      this.team
    );

    this.lastShootTime = now;
  }

  private handleReset() {
    // Show confirmation dialog
    if (
      confirm(
        "Are you sure you want to reset the game? This will remove all players and projectiles."
      )
    ) {
      // Reset the game state
      this.gameService.resetGame();

      // Clear local state
      this.otherPlayers.forEach((player) => player.destroy());
      this.otherPlayers.clear();
      this.projectiles.forEach((projectile) => projectile.destroy());
      this.projectiles.clear();

      // Reset player health
      this.playerHealth = this.maxHealth;
      this.updateHealthBar();

      // Show team selection modal again
      this.showTeamSelection = true;
      this.showTeamSelectionModal();
    }
  }

  shutdown() {
    this.gameService.leaveGame();
  }
}
