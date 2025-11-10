import Phaser from 'phaser';
import { Tower, TowerType, GAME_CONFIG } from '@shared/types';
import { EnemySprite } from './EnemySprite';

export class TowerSprite extends Phaser.GameObjects.Container {
  private towerData: Tower;
  private graphics: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private lastAttackTime: number = 0;
  private rangeCircle?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: Tower) {
    super(scene, data.position.x, data.position.y);

    this.towerData = data;

    // Create tower visual
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    // Health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);

    this.draw();
  }

  private draw(): void {
    const config = GAME_CONFIG.TOWER_DATA[this.towerData.type];

    this.graphics.clear();

    // Tower color based on type
    let color = 0x00ff00;
    switch (this.towerData.type) {
      case TowerType.ARCHER:
        color = 0x00ff00;
        break;
      case TowerType.CANNON:
        color = 0xff8800;
        break;
      case TowerType.MAGIC:
        color = 0x8800ff;
        break;
      case TowerType.SNIPER:
        color = 0x0088ff;
        break;
    }

    // Draw tower base
    this.graphics.fillStyle(0x333333, 1);
    this.graphics.fillRect(-25, 15, 50, 20);

    // Draw tower body
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(-20, -15, 40, 30);

    // Draw tower top
    this.graphics.fillStyle(color, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(-20, -15);
    this.graphics.lineTo(0, -30);
    this.graphics.lineTo(20, -15);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Health bar
    this.healthBar.clear();
    this.healthBar.fillStyle(0xff0000, 1);
    this.healthBar.fillRect(-20, -40, 40, 4);
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(-20, -40, 40 * (this.towerData.health / 100), 4);
  }

  update(delta: number, enemies: EnemySprite[]): void {
    const config = GAME_CONFIG.TOWER_DATA[this.towerData.type];
    const attackCooldown = 1000 / config.attackSpeed;

    this.lastAttackTime += delta;

    if (this.lastAttackTime >= attackCooldown) {
      // Find enemies in range
      const target = this.findTarget(enemies, config.range);

      if (target) {
        this.attack(target);
        this.lastAttackTime = 0;
      }
    }
  }

  private findTarget(enemies: EnemySprite[], range: number): EnemySprite | null {
    let closestEnemy: EnemySprite | null = null;
    let closestDistance = range;

    for (const enemy of enemies) {
      // Only target enemies on the opposite side
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

      if (distance <= range && distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    }

    return closestEnemy;
  }

  private attack(target: EnemySprite): void {
    // Draw projectile
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(3, 0xffff00, 1);
    graphics.lineBetween(this.x, this.y, target.x, target.y);

    // Remove projectile after a short time
    this.scene.time.delayedCall(100, () => {
      graphics.destroy();
    });

    // In a real implementation, this would send damage to server
    // For now, just visual feedback
  }

  updateData(data: Partial<Tower>): void {
    if (data.health !== undefined) {
      this.towerData.health = data.health;
      this.draw();
    }

    if (data.position) {
      this.x = data.position.x;
      this.y = data.position.y;
    }
  }

  showRange(): void {
    const config = GAME_CONFIG.TOWER_DATA[this.towerData.type];

    if (!this.rangeCircle) {
      this.rangeCircle = this.scene.add.graphics();
      this.add(this.rangeCircle);
    }

    this.rangeCircle.clear();
    this.rangeCircle.lineStyle(2, 0xffff00, 0.3);
    this.rangeCircle.strokeCircle(0, 0, config.range);
  }

  hideRange(): void {
    if (this.rangeCircle) {
      this.rangeCircle.clear();
    }
  }
}
