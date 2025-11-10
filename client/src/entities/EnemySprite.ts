import Phaser from 'phaser';
import { Enemy, EnemyType, GAME_CONFIG } from '@shared/types';

export class EnemySprite extends Phaser.GameObjects.Container {
  private enemyData: Enemy;
  private graphics: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: Enemy) {
    super(scene, data.position.x, data.position.y);

    this.enemyData = data;

    // Create enemy visual
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    // Health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);

    this.draw();
  }

  private draw(): void {
    const config = GAME_CONFIG.ENEMY_DATA[this.enemyData.type];

    this.graphics.clear();

    // Enemy color and size based on type
    let color = 0xff0000;
    let size = 15;

    switch (this.enemyData.type) {
      case EnemyType.SCOUT:
        color = 0xff0000;
        size = 12;
        break;
      case EnemyType.WARRIOR:
        color = 0xff4444;
        size = 18;
        break;
      case EnemyType.TANK:
        color = 0xff8800;
        size = 25;
        break;
      case EnemyType.BOSS:
        color = 0xff00ff;
        size = 35;
        break;
    }

    // Draw enemy body
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
    this.healthBar.fillRect(-size, -size - 10, size * 2 * (this.enemyData.health / maxHealth), 4);
  }

  update(delta: number): void {
    // Move towards target base
    const config = GAME_CONFIG.ENEMY_DATA[this.enemyData.type];
    const speed = config.speed * (delta / 1000);

    // Move horizontally towards target side
    if (this.enemyData.targetSide === 'left') {
      this.x -= speed;
    } else {
      this.x += speed;
    }

    // In a real implementation, this would sync with server
  }

  updateData(data: Partial<Enemy>): void {
    if (data.health !== undefined) {
      this.enemyData.health = data.health;
      this.draw();
    }

    if (data.position) {
      this.x = data.position.x;
      this.y = data.position.y;
    }
  }

  getData(): Enemy {
    return this.enemyData;
  }
}
