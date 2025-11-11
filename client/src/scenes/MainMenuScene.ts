import Phaser from 'phaser';
import { NetworkManager } from '../managers/NetworkManager';

export class MainMenuScene extends Phaser.Scene {
  private roomIdInput?: HTMLInputElement;
  private joinButton?: Phaser.GameObjects.Text;

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

    // Create HTML input for room ID
    this.createRoomIdInput(width, height);

    this.joinButton = this.add.text(width / 2, height / 2 + 220, 'Join Room', {
      fontSize: '32px',
      color: '#888888',
      backgroundColor: '#444444',
      padding: { x: 40, y: 20 }
    })
    .setOrigin(0.5)
    .setAlpha(0.5)
    .on('pointerdown', () => {
      const roomId = this.roomIdInput?.value.trim();
      if (roomId && roomId.length >= 4) {
        this.joinRoom(roomId, playerName);
      }
    });

    // Update join button on input change
    this.updateJoinButton();

    // Instructions
    this.add.text(width / 2, height - 100,
      'Build towers to defend • Send enemies to attack • Destroy opponent\'s base!', {
      fontSize: '20px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
  }

  private createRoomIdInput(width: number, height: number): void {
    // Create HTML input element
    this.roomIdInput = document.createElement('input');
    this.roomIdInput.type = 'text';
    this.roomIdInput.placeholder = 'Enter room code';
    this.roomIdInput.maxLength = 6;
    this.roomIdInput.style.position = 'absolute';
    this.roomIdInput.style.fontSize = '28px';
    this.roomIdInput.style.padding = '10px 20px';
    this.roomIdInput.style.backgroundColor = '#333333';
    this.roomIdInput.style.color = '#ffff00';
    this.roomIdInput.style.border = '2px solid #666666';
    this.roomIdInput.style.borderRadius = '5px';
    this.roomIdInput.style.textAlign = 'center';
    this.roomIdInput.style.fontFamily = 'monospace';
    this.roomIdInput.style.textTransform = 'uppercase';
    this.roomIdInput.style.outline = 'none';

    // Position the input (roughly centered)
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      const canvas = gameContainer.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scale = rect.width / width;

        this.roomIdInput.style.left = `${rect.left + (width / 2) * scale}px`;
        this.roomIdInput.style.top = `${rect.top + (height / 2 + 150) * scale}px`;
        this.roomIdInput.style.transform = 'translate(-50%, -50%)';
      }
    }

    // Add input event listener
    this.roomIdInput.addEventListener('input', () => {
      // Convert to uppercase
      if (this.roomIdInput) {
        this.roomIdInput.value = this.roomIdInput.value.toUpperCase();
      }
      this.updateJoinButton();
    });

    // Add enter key listener
    this.roomIdInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const roomId = this.roomIdInput?.value.trim();
        if (roomId && roomId.length >= 4) {
          const playerName = localStorage.getItem('playerName') || 'Player' + Math.floor(Math.random() * 1000);
          this.joinRoom(roomId, playerName);
        }
      }
    });

    // Add to DOM
    document.body.appendChild(this.roomIdInput);

    // Focus on input
    this.roomIdInput.focus();
  }

  private updateJoinButton(): void {
    if (!this.joinButton || !this.roomIdInput) return;

    const roomId = this.roomIdInput.value.trim();
    const isValid = roomId.length >= 4;

    if (isValid) {
      this.joinButton.setColor('#ffffff');
      this.joinButton.setBackgroundColor('#0000aa');
      this.joinButton.setAlpha(1);
      this.joinButton.setInteractive({ useHandCursor: true });

      this.joinButton.off('pointerover');
      this.joinButton.off('pointerout');

      this.joinButton.on('pointerover', () => {
        if (this.joinButton) {
          this.joinButton.setBackgroundColor('#0000ff');
        }
      });

      this.joinButton.on('pointerout', () => {
        if (this.joinButton) {
          this.joinButton.setBackgroundColor('#0000aa');
        }
      });
    } else {
      this.joinButton.setColor('#888888');
      this.joinButton.setBackgroundColor('#444444');
      this.joinButton.setAlpha(0.5);
      this.joinButton.disableInteractive();
      this.joinButton.off('pointerover');
      this.joinButton.off('pointerout');
    }
  }

  shutdown(): void {
    // Clean up HTML input when scene is shut down
    this.cleanupInput();
  }

  private createRoom(playerName: string): void {
    // Clean up input before switching scenes
    this.cleanupInput();

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
        // Clean up input only on success
        this.cleanupInput();
        this.scene.start('GameScene', { roomId, playerName });
      } else {
        alert('Failed to join room. Room may not exist or is full.');
        // Keep input field so user can try again - clear it and refocus
        if (this.roomIdInput) {
          this.roomIdInput.value = '';
          this.roomIdInput.focus();
          this.updateJoinButton();
        }
      }
    });
  }

  private cleanupInput(): void {
    if (this.roomIdInput && this.roomIdInput.parentNode) {
      this.roomIdInput.parentNode.removeChild(this.roomIdInput);
      this.roomIdInput = undefined;
    }
  }
}
