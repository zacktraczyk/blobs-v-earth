import "phaser";

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private earth!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private invaders!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private lastFired: number = 0;
  private gameSpeed: number = 200;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load game assets
    this.load.image("earth", "assets/earth.png");
    this.load.image("player", "assets/player.png");
    this.load.image("invader", "assets/invader.png");
    this.load.image("projectile", "assets/projectile.png");
    this.load.image("background", "assets/background.png");
  }

  create() {
    // Add background that covers the entire game area
    const background = this.add.tileSprite(
      0,
      0,
      this.scale.width,
      this.scale.height,
      "background"
    );
    background.setOrigin(0, 0);

    // Add Earth in the center
    this.earth = this.add.sprite(
      this.scale.width / 2,
      this.scale.height / 2,
      "earth"
    );
    this.earth.setScale(2);

    // Create player
    this.player = this.physics.add.sprite(100, this.scale.height / 2, "player");
    this.player.setCollideWorldBounds(true);

    // Setup input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Create groups for invaders and projectiles
    this.invaders = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    // Spawn invaders periodically
    this.time.addEvent({
      delay: 2000,
      callback: this.spawnInvader,
      callbackScope: this,
      loop: true,
    });

    // Add collision detection
    this.physics.add.overlap(
      this.projectiles,
      this.invaders,
      this.hitInvader,
      undefined,
      this
    );

    // Handle window resize
    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize: Phaser.Structs.Size) {
    // Update background
    const background = this.children.list.find(
      (child) => child instanceof Phaser.GameObjects.TileSprite
    ) as Phaser.GameObjects.TileSprite;
    if (background) {
      background.setSize(gameSize.width, gameSize.height);
    }

    // Update earth position
    if (this.earth) {
      this.earth.setPosition(gameSize.width / 2, gameSize.height / 2);
    }

    // Update world bounds
    this.physics.world.setBounds(0, 0, gameSize.width, gameSize.height);
  }

  update() {
    if (!this.player) return;

    // Player movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-this.gameSpeed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(this.gameSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-this.gameSpeed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(this.gameSpeed);
    } else {
      this.player.setVelocityY(0);
    }

    // Shooting
    const time = this.time.now;
    if (this.cursors.space.isDown && time - this.lastFired > 250) {
      const projectile = this.projectiles.create(
        this.player.x,
        this.player.y,
        "projectile"
      );
      if (projectile) {
        projectile.setVelocityX(400);
      }
      this.lastFired = time;
    }

    // Move invaders towards Earth
    this.invaders.children.each((invader: any) => {
      const angle = Phaser.Math.Angle.Between(
        invader.x,
        invader.y,
        this.earth.x,
        this.earth.y
      );
      invader.setVelocityX(Math.cos(angle) * 100);
      invader.setVelocityY(Math.sin(angle) * 100);
      return true;
    });
  }

  private spawnInvader() {
    const side = Phaser.Math.Between(0, 3); // 0: top, 1: right, 2: bottom, 3: left
    let x = 0;
    let y = 0;

    switch (side) {
      case 0: // top
        x = Phaser.Math.Between(0, this.scale.width);
        y = -50;
        break;
      case 1: // right
        x = this.scale.width + 50;
        y = Phaser.Math.Between(0, this.scale.height);
        break;
      case 2: // bottom
        x = Phaser.Math.Between(0, this.scale.width);
        y = this.scale.height + 50;
        break;
      case 3: // left
        x = -50;
        y = Phaser.Math.Between(0, this.scale.height);
        break;
    }

    const invader = this.invaders.create(x, y, "invader");
    if (invader) {
      invader.setScale(0.5);
    }
  }

  private hitInvader(
    projectile:
      | Phaser.Tilemaps.Tile
      | Phaser.Tilemaps.LayerData
      | Phaser.GameObjects.GameObject
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody,
    invader:
      | Phaser.Tilemaps.Tile
      | Phaser.Tilemaps.LayerData
      | Phaser.GameObjects.GameObject
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
  ) {
    if (projectile instanceof Phaser.GameObjects.GameObject) {
      projectile.destroy();
    }
    if (invader instanceof Phaser.GameObjects.GameObject) {
      invader.destroy();
    }
  }
}
