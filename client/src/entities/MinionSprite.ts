import Phaser from 'phaser';
import { Minion, MinionType, GAME_CONFIG } from '@shared/types';

export class MinionSprite extends Phaser.GameObjects.Container {
  private minionData: Minion;
  private graphics: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: Minion) {
    super(scene, data.position.x, data.position.y);

    this.minionData = data;

    // Create minion visual
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    // Health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);

    this.draw();
  }

  private draw(): void {
    const config = GAME_CONFIG.MINION_DATA[this.minionData.type];

    this.graphics.clear();

    // Minion color and size based on type
    let color = 0xff0000;
    let size = 15;

    switch (this.minionData.type) {
      case MinionType.SCOUT:
        color = 0xff0000;
        size = 12;
        break;
      case MinionType.WARRIOR:
        color = 0xff4444;
        size = 18;
        break;
      case MinionType.TANK:
        color = 0xff8800;
        size = 25;
        break;
      case MinionType.BOSS:
        color = 0xff00ff;
        size = 35;
        break;
    }

    // Draw minion body
    this.graphics.fillStyle(color, 1);
    this.graphics.fillCircle(0, 0, size);

    // Draw eyes
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(-size / 3, -size / 3, size / 5);
    this.graphics.fillCircle(size / 3, -size / 3, size / 5);

    // Health bar
    const maxHealth = config.health;
    this.healthBar.clear();
    this.healthBar.fillStyle(0xff0000, 1);
    this.healthBar.fillRect(-size, -size - 10, size * 2, 4);
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(-size, -size - 10, size * 2 * (this.minionData.health / maxHealth), 4);
  }

  update(delta: number): void {
    // Move towards target base
    const config = GAME_CONFIG.MINION_DATA[this.minionData.type];
    const speed = config.speed * (delta / 1000);

    // Move horizontally towards target side
    if (this.minionData.targetSide === 'left') {
      this.x -= speed;
    } else {
      this.x += speed;
    }

    // In a real implementation, this would sync with server
  }

  updateData(data: Partial<Minion>): void {
    if (data.health !== undefined) {
      this.minionData.health = data.health;
      this.draw();
    }

    if (data.position) {
      this.x = data.position.x;
      this.y = data.position.y;
    }
  }

  getData(): Minion {
    return this.minionData;
  }
}
