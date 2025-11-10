import Phaser from 'phaser';
import { NetworkManager } from '../managers/NetworkManager';
import { TowerSprite } from '../entities/TowerSprite';
import { EnemySprite } from '../entities/EnemySprite';
import { TowerType, EnemyType, GAME_CONFIG, GameRoom, Tower, Enemy } from '@shared/types';

export class GameScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private roomId!: string;
  private playerName!: string;
  private playerId?: string;
  private playerSide?: 'left' | 'right';

  private towers: Map<string, TowerSprite> = new Map();
  private enemies: Map<string, EnemySprite> = new Map();

  private goldText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private selectedTowerType: TowerType | null = null;

  private gold: number = GAME_CONFIG.STARTING_GOLD;
  private health: number = GAME_CONFIG.BASE_HEALTH;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { roomId: string; playerName: string }): void {
    this.roomId = data.roomId;
    this.playerName = data.playerName;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0);

    // Draw battlefield
    this.createBattlefield();

    // UI
    this.createUI();

    // Network setup
    this.networkManager = NetworkManager.getInstance();
    this.setupNetworkListeners();

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
  }

  update(time: number, delta: number): void {
    // Update all entities
    this.enemies.forEach(enemy => enemy.update(delta));
    this.towers.forEach(tower => tower.update(delta, Array.from(this.enemies.values())));
  }

  private createBattlefield(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw center line
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xff0000, 1);
    graphics.lineBetween(width / 2, 0, width / 2, height);

    // Draw bases
    // Left base
    this.add.rectangle(100, height / 2, 100, 200, 0x0000ff).setStrokeStyle(4, 0x0000aa);
    this.add.text(100, height / 2, 'BASE', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Right base
    this.add.rectangle(width - 100, height / 2, 100, 200, 0xff0000).setStrokeStyle(4, 0xaa0000);
    this.add.text(width - 100, height / 2, 'BASE', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Draw lanes
    const laneY = [height * 0.3, height * 0.5, height * 0.7];
    graphics.lineStyle(2, 0x444444, 0.5);
    laneY.forEach(y => {
      graphics.lineBetween(0, y, width, y);
    });
  }

  private createUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Top bar - Stats
    const topBar = this.add.rectangle(width / 2, 30, width, 60, 0x000000, 0.7).setOrigin(0.5);

    this.goldText = this.add.text(20, 30, `Gold: ${this.gold}`, {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0, 0.5);

    this.healthText = this.add.text(width - 20, 30, `Health: ${this.health}`, {
      fontSize: '24px',
      color: '#ff0000'
    }).setOrigin(1, 0.5);

    // Bottom bar - Tower selection
    const bottomBar = this.add.rectangle(width / 2, height - 100, width, 200, 0x000000, 0.8).setOrigin(0.5);

    this.add.text(width / 2, height - 180, 'BUILD TOWERS', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Tower buttons
    const towerTypes = [TowerType.ARCHER, TowerType.CANNON, TowerType.MAGIC, TowerType.SNIPER];
    const buttonWidth = 200;
    const startX = (width - (buttonWidth * towerTypes.length + 20 * (towerTypes.length - 1))) / 2;

    towerTypes.forEach((type, index) => {
      const data = GAME_CONFIG.TOWER_DATA[type];
      const x = startX + index * (buttonWidth + 20);
      const y = height - 120;

      const button = this.add.rectangle(x, y, buttonWidth, 80, 0x00aa00)
        .setStrokeStyle(2, 0x00ff00)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedTowerType = type;
          // Highlight selected
          this.children.list.forEach(child => {
            if (child instanceof Phaser.GameObjects.Rectangle && child !== topBar && child !== bottomBar) {
              if (child === button) {
                child.setStrokeStyle(4, 0xffff00);
              } else {
                child.setStrokeStyle(2, 0x00ff00);
              }
            }
          });
        });

      this.add.text(x, y - 20, type, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(x, y + 10, `Cost: ${data.cost}`, {
        fontSize: '14px',
        color: '#ffff00'
      }).setOrigin(0.5);

      this.add.text(x, y + 30, `DMG: ${data.damage} | RNG: ${data.range}`, {
        fontSize: '12px',
        color: '#aaaaaa'
      }).setOrigin(0.5);
    });

    // Enemy sending section
    this.add.text(width / 2, height - 180, 'SEND ENEMIES', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const enemyTypes = [EnemyType.SCOUT, EnemyType.WARRIOR, EnemyType.TANK, EnemyType.BOSS];
    const enemyButtonWidth = 150;
    const enemyStartX = (width - (enemyButtonWidth * enemyTypes.length + 15 * (enemyTypes.length - 1))) / 2;

    enemyTypes.forEach((type, index) => {
      const data = GAME_CONFIG.ENEMY_DATA[type];
      const x = enemyStartX + index * (enemyButtonWidth + 15);
      const y = height - 40;

      const button = this.add.rectangle(x, y, enemyButtonWidth, 60, 0xaa0000)
        .setStrokeStyle(2, 0xff0000)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.sendEnemy(type);
        });

      this.add.text(x, y - 15, type, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(x, y + 10, `Cost: ${data.cost}`, {
        fontSize: '12px',
        color: '#ffff00'
      }).setOrigin(0.5);
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedTowerType || !this.playerSide) return;

    // Check if click is in valid area (player's side)
    const width = this.cameras.main.width;
    const validX = this.playerSide === 'left' ? pointer.x < width / 2 : pointer.x > width / 2;

    if (validX && pointer.y > 100 && pointer.y < this.cameras.main.height - 200) {
      const towerData = GAME_CONFIG.TOWER_DATA[this.selectedTowerType];

      if (this.gold >= towerData.cost) {
        this.networkManager.placeTower(this.selectedTowerType, { x: pointer.x, y: pointer.y });
        this.gold -= towerData.cost;
        this.updateUI();
      } else {
        console.log('Not enough gold!');
      }
    }
  }

  private sendEnemy(type: EnemyType): void {
    const enemyData = GAME_CONFIG.ENEMY_DATA[type];

    if (this.gold >= enemyData.cost) {
      this.networkManager.sendEnemy(type);
      this.gold -= enemyData.cost;
      this.updateUI();
    } else {
      console.log('Not enough gold!');
    }
  }

  private setupNetworkListeners(): void {
    this.networkManager.on('gameState', (room: GameRoom) => {
      // Find our player
      const player = room.players.find(p => p.name === this.playerName);
      if (player) {
        this.playerId = player.id;
        this.playerSide = player.side;
        this.gold = player.gold;
        this.health = player.health;
        this.updateUI();
      }

      // Update all towers
      room.towers.forEach(towerData => {
        if (!this.towers.has(towerData.id)) {
          const tower = new TowerSprite(this, towerData);
          this.towers.set(towerData.id, tower);
          this.add.existing(tower);
        }
      });

      // Update all enemies
      room.enemies.forEach(enemyData => {
        if (!this.enemies.has(enemyData.id)) {
          const enemy = new EnemySprite(this, enemyData);
          this.enemies.set(enemyData.id, enemy);
          this.add.existing(enemy);
        } else {
          this.enemies.get(enemyData.id)?.updateData(enemyData);
        }
      });
    });

    this.networkManager.on('towerPlaced', (tower: Tower) => {
      const towerSprite = new TowerSprite(this, tower);
      this.towers.set(tower.id, towerSprite);
      this.add.existing(towerSprite);
    });

    this.networkManager.on('enemySpawned', (enemy: Enemy) => {
      const enemySprite = new EnemySprite(this, enemy);
      this.enemies.set(enemy.id, enemySprite);
      this.add.existing(enemySprite);
    });

    this.networkManager.on('entityDestroyed', (id: string) => {
      if (this.towers.has(id)) {
        this.towers.get(id)?.destroy();
        this.towers.delete(id);
      }
      if (this.enemies.has(id)) {
        this.enemies.get(id)?.destroy();
        this.enemies.delete(id);
      }
    });

    this.networkManager.on('gameOver', (winnerId: string) => {
      const isWinner = winnerId === this.playerId;
      this.showGameOver(isWinner);
    });
  }

  private updateUI(): void {
    this.goldText.setText(`Gold: ${this.gold}`);
    this.healthText.setText(`Health: ${this.health}`);
  }

  private showGameOver(isWinner: boolean): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    const text = this.add.text(width / 2, height / 2, isWinner ? 'VICTORY!' : 'DEFEAT', {
      fontSize: '72px',
      color: isWinner ? '#00ff00' : '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
