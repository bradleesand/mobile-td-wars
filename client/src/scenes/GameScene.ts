import Phaser from 'phaser';
import { NetworkManager } from '../managers/NetworkManager';
import { TowerSprite } from '../entities/TowerSprite';
import { MinionSprite } from '../entities/MinionSprite';
import { TowerType, MinionType, GAME_CONFIG, GameRoom, Tower, Minion } from '@shared/types';

export class GameScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private roomId!: string;
  private playerName!: string;
  private playerId?: string;
  private playerSide?: 'left' | 'right';

  private towers: Map<string, TowerSprite> = new Map();
  private minions: Map<string, MinionSprite> = new Map();

  private goldText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private sideIndicatorText!: Phaser.GameObjects.Text;
  private copyButton!: Phaser.GameObjects.Text;
  private readyButton?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text; // Status text below ready button
  private selectedTowerType: TowerType | null = null;
  private towerButtons: Phaser.GameObjects.Rectangle[] = [];
  private minionButtons: Phaser.GameObjects.Rectangle[] = [];
  private buttonsEnabled: boolean = false;

  private gold: number = GAME_CONFIG.STARTING_GOLD;
  private health: number = GAME_CONFIG.BASE_HEALTH;
  private isReady: boolean = false;

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
    this.createReadyButton();

    // Network setup
    this.networkManager = NetworkManager.getInstance();
    this.setupNetworkListeners();

    // Input
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
  }

  update(_time: number, delta: number): void {
    // Update all entities
    this.minions.forEach(minion => minion.update(delta));
    this.towers.forEach(tower => tower.update(delta, Array.from(this.minions.values())));
  }

  private createBattlefield(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Draw grid
    const gridSize = GAME_CONFIG.GRID_SIZE;
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x333333, 0.3);

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, height);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      gridGraphics.lineBetween(0, y, width, y);
    }

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

    // Side indicator (will be updated when side is known)
    this.sideIndicatorText = this.add.text(width / 2, 30, `Room Code: ${this.roomId}`, {
      fontSize: '28px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Copy room ID button
    this.copyButton = this.add.text(width / 2 + 300, 30, '📋 COPY', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#0066aa',
      padding: { x: 15, y: 8 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      // Copy to clipboard
      navigator.clipboard.writeText(this.roomId).then(() => {
        // Show feedback
        this.copyButton.setText('✓ COPIED!');
        this.copyButton.setBackgroundColor('#00aa00');
        this.time.delayedCall(2000, () => {
          this.copyButton.setText('📋 COPY');
          this.copyButton.setBackgroundColor('#0066aa');
        });
      }).catch(() => {
        // Fallback feedback if clipboard fails
        this.copyButton.setText('✗ FAILED');
        this.copyButton.setBackgroundColor('#aa0000');
        this.time.delayedCall(2000, () => {
          this.copyButton.setText('📋 COPY');
          this.copyButton.setBackgroundColor('#0066aa');
        });
      });
    })
    .on('pointerover', () => {
      this.copyButton.setBackgroundColor('#0088cc');
    })
    .on('pointerout', () => {
      if (this.copyButton.text === '📋 COPY') {
        this.copyButton.setBackgroundColor('#0066aa');
      }
    });

    // Bottom bar
    const bottomBar = this.add.rectangle(width / 2, height - 100, width, 200, 0x000000, 0.8).setOrigin(0.5);

    // Left section - Build Towers
    this.add.text(width / 4, height - 180, 'BUILD TOWERS', {
      fontSize: '20px',
      color: '#00ff00'
    }).setOrigin(0.5);

    // Tower buttons (left side)
    const towerTypes = [TowerType.ARCHER, TowerType.CANNON, TowerType.MAGIC, TowerType.SNIPER];
    const buttonWidth = 180;
    const buttonHeight = 70;
    const buttonSpacing = 10;
    const totalTowerWidth = (buttonWidth * towerTypes.length) + (buttonSpacing * (towerTypes.length - 1));
    const towerStartX = (width / 4) - (totalTowerWidth / 2) + (buttonWidth / 2);

    towerTypes.forEach((type, index) => {
      const data = GAME_CONFIG.TOWER_DATA[type];
      const x = towerStartX + index * (buttonWidth + buttonSpacing);
      const y = height - 100;

      const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x00aa00)
        .setStrokeStyle(2, 0x00ff00)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (!this.buttonsEnabled) return; // Ignore clicks if disabled
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

      // Store reference and set initial disabled state
      this.towerButtons.push(button);
      button.setAlpha(0.4); // Visually disabled

      this.add.text(x, y - 20, type, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0.4);

      this.add.text(x, y + 10, `Cost: ${data.cost}`, {
        fontSize: '14px',
        color: '#ffff00'
      }).setOrigin(0.5).setAlpha(0.4);

      this.add.text(x, y + 30, `DMG: ${data.damage} | RNG: ${data.range}`, {
        fontSize: '12px',
        color: '#aaaaaa'
      }).setOrigin(0.5).setAlpha(0.4);
    });

    // Right section - Send Minions
    this.add.text(width * 3 / 4, height - 180, 'SEND MINIONS', {
      fontSize: '20px',
      color: '#ff0000'
    }).setOrigin(0.5);

    // Minion buttons (right side)
    const minionTypes = [MinionType.SCOUT, MinionType.WARRIOR, MinionType.TANK, MinionType.BOSS];
    const totalMinionWidth = (buttonWidth * minionTypes.length) + (buttonSpacing * (minionTypes.length - 1));
    const minionStartX = (width * 3 / 4) - (totalMinionWidth / 2) + (buttonWidth / 2);

    minionTypes.forEach((type, index) => {
      const data = GAME_CONFIG.MINION_DATA[type];
      const x = minionStartX + index * (buttonWidth + buttonSpacing);
      const y = height - 100;

      const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0xaa0000)
        .setStrokeStyle(2, 0xff0000)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (!this.buttonsEnabled) return; // Ignore clicks if disabled
          this.sendMinion(type);
        });

      // Store reference and set initial disabled state
      this.minionButtons.push(button);
      button.setAlpha(0.4); // Visually disabled

      this.add.text(x, y - 15, type, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0.4);

      this.add.text(x, y + 10, `Cost: ${data.cost}`, {
        fontSize: '12px',
        color: '#ffff00'
      }).setOrigin(0.5).setAlpha(0.4);
    });
  }

  private createReadyButton(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.readyButton = this.add.text(width / 2, height / 2, 'READY', {
      fontSize: '64px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 60, y: 30 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setVisible(true) // Show from the beginning
    .on('pointerdown', () => {
      if (!this.isReady) {
        this.isReady = true;
        this.networkManager.ready();
        if (this.readyButton) {
          this.readyButton.setText('WAITING...');
          this.readyButton.setBackgroundColor('#666666');
          this.readyButton.disableInteractive();
        }
        // Update top text to show waiting for opponent
        this.sideIndicatorText.setText('Waiting for opponent to be ready...');
        this.sideIndicatorText.setColor('#ffff00');
      }
    })
    .on('pointerover', () => {
      if (!this.isReady && this.readyButton) {
        this.readyButton.setBackgroundColor('#00ff00');
      }
    })
    .on('pointerout', () => {
      if (!this.isReady && this.readyButton) {
        this.readyButton.setBackgroundColor('#00aa00');
      }
    });

    // Status text below ready button
    this.statusText = this.add.text(width / 2, height / 2 + 100, 'Waiting for opponent...', {
      fontSize: '24px',
      color: '#ffff00'
    })
    .setOrigin(0.5)
    .setVisible(true);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedTowerType || !this.playerSide) return;

    // Check if click is in valid area (player's side)
    const width = this.cameras.main.width;
    const validX = this.playerSide === 'left' ? pointer.x < width / 2 : pointer.x > width / 2;

    if (validX && pointer.y > 100 && pointer.y < this.cameras.main.height - 200) {
      const towerData = GAME_CONFIG.TOWER_DATA[this.selectedTowerType];

      if (this.gold >= towerData.cost) {
        // Snap to grid
        const gridSize = GAME_CONFIG.GRID_SIZE;
        const snappedX = Math.round(pointer.x / gridSize) * gridSize;
        const snappedY = Math.round(pointer.y / gridSize) * gridSize;

        this.networkManager.placeTower(this.selectedTowerType, { x: snappedX, y: snappedY });
        // Gold will be updated by server via gameState event
      } else {
        console.log('Not enough gold!');
      }
    }
  }

  private sendMinion(type: MinionType): void {
    const minionData = GAME_CONFIG.MINION_DATA[type];

    if (this.gold >= minionData.cost) {
      this.networkManager.sendMinion(type);
      // Gold will be updated by server via gameState event
    } else {
      console.log('Not enough gold!');
    }
  }

  private setupNetworkListeners(): void {
    this.networkManager.on('gameState', (room: GameRoom) => {
      console.log('[GameScene] gameState received:', {
        state: room.state,
        playerCount: room.players.length,
        players: room.players.map(p => ({ name: p.name, side: p.side }))
      });

      // Find our player
      const player = room.players.find(p => p.name === this.playerName);
      if (player) {
        this.playerId = player.id;
        this.playerSide = player.side;
        this.gold = player.gold;
        this.health = player.health;
      }

      // Always update UI to reflect current room state
      this.updateUI(room.state, room.players.length);

      // Handle button states based on game state
      if (room.state === 'PLAYING' && !this.buttonsEnabled) {
        // Enable all gameplay buttons
        this.buttonsEnabled = true;
        this.towerButtons.forEach(btn => btn.setAlpha(1));
        this.minionButtons.forEach(btn => btn.setAlpha(1));

        // Enable all associated text by finding children near button positions
        this.children.list.forEach(child => {
          if (child instanceof Phaser.GameObjects.Text) {
            const isNearButton = this.towerButtons.some(btn =>
              Math.abs(child.x - btn.x) < 100 && Math.abs(child.y - btn.y) < 50
            ) || this.minionButtons.some(btn =>
              Math.abs(child.x - btn.x) < 100 && Math.abs(child.y - btn.y) < 50
            );
            if (isNearButton) {
              child.setAlpha(1);
            }
          }
        });

        // Hide ready button and status text
        if (this.readyButton) {
          this.readyButton.setVisible(false);
        }
        if (this.statusText) {
          this.statusText.setVisible(false);
        }
      }

      // Update all towers
      room.towers.forEach(towerData => {
        if (!this.towers.has(towerData.id)) {
          const tower = new TowerSprite(this, towerData);
          this.towers.set(towerData.id, tower);
          this.add.existing(tower);
        }
      });

      // Update all minions
      room.minions.forEach(minionData => {
        if (!this.minions.has(minionData.id)) {
          const minion = new EnemySprite(this, minionData);
          this.minions.set(minionData.id, minion);
          this.add.existing(minion);
        } else {
          this.minions.get(minionData.id)?.updateData(minionData);
        }
      });
    });

    this.networkManager.on('towerPlaced', (tower: Tower) => {
      if (!this.towers.has(tower.id)) {
        const towerSprite = new TowerSprite(this, tower);
        this.towers.set(tower.id, towerSprite);
        this.add.existing(towerSprite);
      }
    });

    this.networkManager.on('minionSpawned', (minion: Minion) => {
      if (!this.minions.has(minion.id)) {
        const minionSprite = new EnemySprite(this, minion);
        this.minions.set(minion.id, minionSprite);
        this.add.existing(minionSprite);
      }
    });

    this.networkManager.on('entityDestroyed', (id: string) => {
      if (this.towers.has(id)) {
        this.towers.get(id)?.destroy();
        this.towers.delete(id);
      }
      if (this.minions.has(id)) {
        this.minions.get(id)?.destroy();
        this.minions.delete(id);
      }
    });

    this.networkManager.on('gameOver', (winnerId: string) => {
      const isWinner = winnerId === this.playerId;
      this.showGameOver(isWinner);
    });
  }

  private updateUI(gameState?: string, playerCount?: number): void {
    console.log('[GameScene] updateUI called:', {
      gameState,
      playerCount,
      playerSide: this.playerSide
    });

    this.goldText.setText(`Gold: ${this.gold}`);
    this.healthText.setText(`Health: ${this.health}`);

    // Show room code when waiting, show side when playing
    if (gameState === 'PLAYING' && this.playerSide) {
      console.log('[GameScene] updateUI -> showing side indicator (PLAYING)');
      const sideText = this.playerSide === 'left' ? '← YOUR SIDE (LEFT)' : 'YOUR SIDE (RIGHT) →';
      this.sideIndicatorText.setText(sideText);
      this.sideIndicatorText.setColor('#00ff00');
      this.copyButton.setVisible(false);
      if (this.statusText) {
        this.statusText.setVisible(false);
      }
    } else if (playerCount && playerCount >= 2) {
      console.log('[GameScene] updateUI -> showing ready prompt (2+ players)');
      // 2+ players waiting - show ready prompt
      if (!this.isReady) {
        this.sideIndicatorText.setText('Click READY to start!');
        this.sideIndicatorText.setColor('#00ff00');
      }
      this.copyButton.setVisible(false);
      // Hide status text when both players present
      if (this.statusText) {
        this.statusText.setVisible(false);
      }
    } else {
      console.log('[GameScene] updateUI -> showing room code (waiting)');
      // 1 player or waiting - show room code
      this.sideIndicatorText.setText(`Room Code: ${this.roomId}`);
      this.sideIndicatorText.setColor('#ffff00');
      this.copyButton.setVisible(true);
      if (this.statusText) {
        this.statusText.setText('Waiting for opponent...');
        this.statusText.setVisible(true);
      }
    }
  }

  private showGameOver(isWinner: boolean): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    this.add.text(width / 2, height / 2, isWinner ? 'VICTORY!' : 'DEFEAT', {
      fontSize: '72px',
      color: isWinner ? '#00ff00' : '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      this.scene.start('MainMenuScene');
    });
  }
}
