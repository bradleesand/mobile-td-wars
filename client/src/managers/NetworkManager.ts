import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, TowerType, EnemyType, Vector2 } from '@shared/types';

export class NetworkManager {
  private static instance: NetworkManager;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private lastGameState: any = null; // Buffer last gameState to handle race conditions

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    // Connect to server (adjust URL for production)
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
    this.socket = io(serverUrl);

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Set up event forwarding
    this.socket.on('gameState', (room) => {
      console.log('[NetworkManager] Received gameState from socket, forwarding to listeners. Listener count:', this.listeners.get('gameState')?.length || 0);
      // Buffer the latest gameState to handle race conditions
      this.lastGameState = room;
      this.emit('gameState', room);
    });

    this.socket.on('playerJoined', (player) => {
      this.emit('playerJoined', player);
    });

    this.socket.on('playerLeft', (playerId) => {
      this.emit('playerLeft', playerId);
    });

    this.socket.on('towerPlaced', (tower) => {
      this.emit('towerPlaced', tower);
    });

    this.socket.on('enemySpawned', (enemy) => {
      this.emit('enemySpawned', enemy);
    });

    this.socket.on('entityUpdated', (entity) => {
      this.emit('entityUpdated', entity);
    });

    this.socket.on('entityDestroyed', (id) => {
      this.emit('entityDestroyed', id);
    });

    this.socket.on('gameOver', (winnerId) => {
      this.emit('gameOver', winnerId);
    });

    this.socket.on('error', (message) => {
      console.error('Server error:', message);
      this.emit('error', message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  createRoom(playerName: string, callback: (roomId: string) => void): void {
    if (!this.socket) return;
    this.socket.emit('createRoom', playerName, callback);
  }

  joinRoom(roomId: string, playerName: string, callback: (success: boolean) => void): void {
    if (!this.socket) return;
    this.socket.emit('joinRoom', roomId, playerName, callback);
  }

  placeTower(type: TowerType, position: Vector2): void {
    if (!this.socket) return;
    this.socket.emit('placeTower', type, position);
  }

  sendEnemy(type: EnemyType): void {
    if (!this.socket) return;
    this.socket.emit('sendEnemy', type);
  }

  ready(): void {
    if (!this.socket) return;
    this.socket.emit('ready');
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // If registering for gameState and we have a buffered state, deliver it immediately
    if (event === 'gameState' && this.lastGameState) {
      console.log('[NetworkManager] Delivering buffered gameState to new listener');
      callback(this.lastGameState);
    }
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }
}
