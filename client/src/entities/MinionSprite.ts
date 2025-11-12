import Phaser from 'phaser';
import { Minion, MinionType, GAME_CONFIG } from '@shared/types';

export class MinionSprite extends Phaser.GameObjects.Container {
  private minionData: Minion;
  private graphics: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private currentPathIndex: number = 0;

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
    // Client-side prediction: move along path between server updates
    if (!this.minionData.path || this.minionData.path.length === 0) {
      return;
    }

    const config = GAME_CONFIG.MINION_DATA[this.minionData.type];
    const moveSpeed = config.speed * (delta / 1000);

    // Get current target waypoint
    if (this.currentPathIndex >= this.minionData.path.length) {
      return; // No more waypoints
    }

    const target = this.minionData.path[this.currentPathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < moveSpeed) {
      // Reached waypoint, move to it exactly and advance to next
      this.x = target.x;
      this.y = target.y;
      this.currentPathIndex++;
    } else {
      // Move towards waypoint
      this.x += (dx / distance) * moveSpeed;
      this.y += (dy / distance) * moveSpeed;
    }

    // Update internal position tracking
    this.minionData.position.x = this.x;
    this.minionData.position.y = this.y;
  }

  updateData(data: Partial<Minion>): void {
    if (data.health !== undefined) {
      this.minionData.health = data.health;
      this.draw();
    }

    if (data.path !== undefined) {
      this.minionData.path = data.path;
      // Reset path index when path updates
      this.currentPathIndex = 0;
    }

    if (data.position) {
      this.minionData.position = data.position;

      // Smoothly correct towards server position instead of snapping
      const dx = data.position.x - this.x;
      const dy = data.position.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If we're very far off (>100px), snap to server position
      // Otherwise, let client-side prediction continue and gradually correct
      if (distance > 100) {
        this.x = data.position.x;
        this.y = data.position.y;

        // Find closest waypoint to current position
        if (this.minionData.path && this.minionData.path.length > 0) {
          let closestIndex = 0;
          let closestDist = Infinity;

          for (let i = 0; i < this.minionData.path.length; i++) {
            const wp = this.minionData.path[i];
            const dist = Math.sqrt(
              Math.pow(wp.x - this.x, 2) + Math.pow(wp.y - this.y, 2)
            );
            if (dist < closestDist) {
              closestDist = dist;
              closestIndex = i;
            }
          }

          this.currentPathIndex = closestIndex;
        }
      }
    }
  }

  getData(): Minion {
    return this.minionData;
  }
}
