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
  private updateInterval: number = 1000 / 30; // 30 FPS for network updates
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
  private healthBar: Phaser.GameObjects.Graphics;
  private playerHealth: number = 100;
  private maxHealth: number = 100;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load game assets
    this.load.image("player", "assets/player.png");
    this.load.image("player2", "assets/player2.png");
    this.load.image("blob", "assets/Blob.png");
    this.load.image("projectile", "assets/projectile.png");
    this.load.image("background", "assets/Earth background.png");
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

    const chillFlyerButton = document.createElement("button");
    chillFlyerButton.textContent = "Chill Flyer";
    chillFlyerButton.style.margin = "10px";
    chillFlyerButton.style.padding = "10px 20px";
    chillFlyerButton.style.backgroundColor = "#9B59B6";
    chillFlyerButton.style.border = "none";
    chillFlyerButton.style.borderRadius = "5px";
    chillFlyerButton.style.color = "white";
    chillFlyerButton.style.cursor = "pointer";
    chillFlyerButton.onclick = () => this.handleTeamSelect("chillFlyer");

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
    modal.appendChild(chillFlyerButton);
    modal.appendChild(blobButton);
    document.body.appendChild(modal);
  }

  private handleTeamSelect(team: Team) {
    this.team = team;
    this.showTeamSelection = false;

    // Update player appearance based on team
    if (team === "earthling") {
      this.player.setTexture("player");
      this.player.setTint(0x4b79a1);
      this.player.setScale(0.5);
    } else if (team === "chillFlyer") {
      this.player.setTexture("player2");
      this.player.setTint(0x9b59b6);
      this.player.setScale(0.5);
    } else {
      this.player.setTexture("blob");
      this.player.setTint(0xffffff);
      this.player.setScale(0.2);
    }
    this.player.setVisible(true);

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
      let texture = "player";
      let tint = 0x4b79a1;
      let scale = 0.5;

      if (playerData.team === "chillFlyer") {
        texture = "player2";
        tint = 0x9b59b6;
        scale = 0.5;
      } else if (playerData.team === "blob") {
        texture = "blob";
        tint = 0xffffff;
        scale = 0.2;
      }

      otherPlayer = this.physics.add.sprite(
        playerData.x,
        playerData.y,
        texture
      );
      otherPlayer.setTint(tint);
      otherPlayer.setOrigin(0.5, 0.5);
      otherPlayer.setScale(scale);
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
      // Update position with interpolation
      const now = Date.now();
      const deltaTime = (now - playerData.lastUpdate) / 1000;
      const distanceX = playerData.velocityX * deltaTime;
      const distanceY = playerData.velocityY * deltaTime;

      const newX = playerData.x + distanceX;
      const newY = playerData.y + distanceY;

      otherPlayer.setPosition(newX, newY);
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

      // Create pulsing effect for the mine
      this.tweens.add({
        targets: projectile,
        scale: 0.5,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private handleProjectileHit(
    projectile: Phaser.Physics.Arcade.Sprite,
    target: Phaser.Physics.Arcade.Sprite
  ) {
    // Create hit effect
    const hitEffect = this.add.particles(0, 0, "projectile", {
      x: projectile.x,
      y: projectile.y,
      speed: 400,
      scale: { start: 3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1500,
      quantity: 50,
      blendMode: "ADD",
      emitting: true,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Circle(projectile.x, projectile.y, 50),
      },
    });

    // Remove hit effect after animation
    this.time.delayedCall(1500, () => {
      hitEffect.destroy();
    });

    // Handle damage
    if (target === this.player) {
      // Take damage instead of instant death
      this.playerHealth = Math.max(0, this.playerHealth - 20);
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
          const newHealth = Math.max(0, playerData.health - 20);
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
      speed: 500,
      scale: { start: 4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 2000,
      quantity: 80,
      blendMode: "ADD",
      emitting: true,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Circle(this.player.x, this.player.y, 100),
      },
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
    let moveX = 0;
    let moveY = 0;

    if (this.wasd.A.isDown) {
      moveX = -this.gameSpeed;
    } else if (this.wasd.D.isDown) {
      moveX = this.gameSpeed;
    }

    if (this.wasd.W.isDown) {
      moveY = -this.gameSpeed;
    } else if (this.wasd.S.isDown) {
      moveY = this.gameSpeed;
    }

    // Apply movement to player
    this.player.setVelocity(moveX, moveY);

    // Calculate rotation based on mouse position
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.x,
      pointer.y
    );
    this.player.setRotation(angle);

    // Update player state in Firebase with actual physics body velocity
    this.gameService.updatePlayerState(
      this.player.x,
      this.player.y,
      this.player.rotation,
      moveX,
      moveY
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

    // Spawn mine at player's position
    this.gameService.fireProjectile(this.player.x, this.player.y, this.team);

    this.lastShootTime = now;
  }

  private handleReset() {
    // Show confirmation dialog
    if (
      confirm(
        "Are you sure you want to reset the game? This will remove all players and projectiles."
      )
    ) {
      // Reset the game state in Firebase
      this.gameService.resetGame();

      // Clear local state
      this.otherPlayers.forEach((player) => {
        const healthBar = player.getData(
          "healthBar"
        ) as Phaser.GameObjects.Graphics;
        if (healthBar) {
          healthBar.destroy();
        }
        player.destroy();
      });
      this.otherPlayers.clear();

      this.projectiles.forEach((projectile) => projectile.destroy());
      this.projectiles.clear();

      // Reset player health and position
      this.playerHealth = this.maxHealth;
      this.player.setPosition(
        Math.random() * this.scale.width,
        Math.random() * this.scale.height
      );
      this.player.setVisible(true);
      this.healthBar.setVisible(true);
      this.updateHealthBar();
      this.gameService.updatePlayerHealth(this.playerHealth);

      // Show team selection modal again
      this.showTeamSelection = true;
      this.showTeamSelectionModal();
    }
  }

  shutdown() {
    this.gameService.leaveGame();
  }
}
