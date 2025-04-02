import "phaser";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
  }

  preload() {
    // Load game assets here
  }

  create() {
    // Create game objects here
    this.add.text(10, 10, "Hello Phaser!", { color: "#ffffff" });
  }

  update() {
    // Game loop code here
  }
}
