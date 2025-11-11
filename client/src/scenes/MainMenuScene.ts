import Phaser from 'phaser';
import { NetworkManager } from '../managers/NetworkManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Title
    this.add.text(width / 2, height / 4, 'MOBILE TD WARS', {
      fontSize: '72px',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 4 + 80, 'Tower Defense Battle Royale', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Get player name
    const playerName = localStorage.getItem('playerName') || 'Player' + Math.floor(Math.random() * 1000);
    localStorage.setItem('playerName', playerName);

    // Create room button
    const createButton = this.add.text(width / 2, height / 2, 'Create Room', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 40, y: 20 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      this.createRoom(playerName);
    })
    .on('pointerover', () => {
      createButton.setBackgroundColor('#00ff00');
    })
    .on('pointerout', () => {
      createButton.setBackgroundColor('#00aa00');
    });

    // Join room section
    this.add.text(width / 2, height / 2 + 100, 'Room ID:', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Create a simple input display (in a real game, you'd use a proper input field)
    this.add.text(width / 2, height / 2 + 150, '______', {
      fontSize: '28px',
      color: '#ffff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    const joinButton = this.add.text(width / 2, height / 2 + 220, 'Join Room', {
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#0000aa',
      padding: { x: 40, y: 20 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      const roomId = prompt('Enter Room ID:');
      if (roomId) {
        this.joinRoom(roomId, playerName);
      }
    })
    .on('pointerover', () => {
      joinButton.setBackgroundColor('#0000ff');
    })
    .on('pointerout', () => {
      joinButton.setBackgroundColor('#0000aa');
    });

    // Instructions
    this.add.text(width / 2, height - 100,
      'Build towers to defend • Send enemies to attack • Destroy opponent\'s base!', {
      fontSize: '20px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
  }

  private createRoom(playerName: string): void {
    const networkManager = NetworkManager.getInstance();
    networkManager.connect();

    networkManager.createRoom(playerName, (roomId: string) => {
      console.log('Room created:', roomId);
      this.scene.start('GameScene', { roomId, playerName });
    });
  }

  private joinRoom(roomId: string, playerName: string): void {
    const networkManager = NetworkManager.getInstance();
    networkManager.connect();

    networkManager.joinRoom(roomId, playerName, (success: boolean) => {
      if (success) {
        console.log('Joined room:', roomId);
        this.scene.start('GameScene', { roomId, playerName });
      } else {
        alert('Failed to join room. Room may not exist or is full.');
      }
    });
  }
}
