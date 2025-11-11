import { Server, Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  GameRoom,
  Player,
  Tower,
  Minion,
  TowerType,
  MinionType,
  Vector2,
  GameState,
  GAME_CONFIG
} from '@shared/types';

export class Room {
  private id: string;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private state: GameRoom;
  private updateInterval?: NodeJS.Timeout;
  private goldInterval?: NodeJS.Timeout;
  private playerSockets: Map<string, Socket> = new Map();
  private updateCounter: number = 0;
  private playersReady: Set<string> = new Set();

  constructor(roomId: string, io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.id = roomId;
    this.io = io;

    this.state = {
      id: roomId,
      players: [],
      towers: [],
      minions: [],
      state: GameState.WAITING,
      createdAt: Date.now()
    };
  }

  addPlayer(socket: Socket, name: string, side: 'left' | 'right'): void {
    const player: Player = {
      id: socket.id,
      name,
      health: GAME_CONFIG.BASE_HEALTH,
      gold: GAME_CONFIG.STARTING_GOLD,
      side
    };

    this.state.players.push(player);
    this.playerSockets.set(socket.id, socket);

    console.log(`[Room ${this.id}] Player ${name} added. Total players: ${this.state.players.length}`);

    // Send gameState directly to joining socket first (ensures they get it even if scene isn't ready yet)
    socket.emit('gameState', this.state);
    console.log(`[Room ${this.id}] Sent direct gameState to ${name}`);

    // Also broadcast to notify other players
    this.broadcastGameState();
    console.log(`[Room ${this.id}] Broadcasted gameState to room`);
  }

  removePlayer(socketId: string): void {
    this.state.players = this.state.players.filter(p => p.id !== socketId);
    this.playerSockets.delete(socketId);

    // Notify remaining players
    this.io.to(this.id).emit('playerLeft', socketId);
    this.broadcastGameState();

    // End game if a player leaves during play
    if (this.state.state === GameState.PLAYING && this.state.players.length < 2) {
      this.endGame(this.state.players[0]?.id || '');
    }
  }

  placeTower(playerId: string, type: TowerType, position: Vector2): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    const towerData = GAME_CONFIG.TOWER_DATA[type];

    // Check if player has enough gold
    if (player.gold < towerData.cost) {
      this.playerSockets.get(playerId)?.emit('error', 'Not enough gold');
      return;
    }

    // Validate position is snapped to grid
    const gridSize = GAME_CONFIG.GRID_SIZE;
    const isSnapped = position.x % gridSize === 0 && position.y % gridSize === 0;

    if (!isSnapped) {
      this.playerSockets.get(playerId)?.emit('error', 'Invalid grid position');
      return;
    }

    // Check if position is on player's side
    const isValidSide = (player.side === 'left' && position.x < GAME_CONFIG.CANVAS_WIDTH / 2) ||
                       (player.side === 'right' && position.x > GAME_CONFIG.CANVAS_WIDTH / 2);

    if (!isValidSide) {
      this.playerSockets.get(playerId)?.emit('error', 'Invalid position');
      return;
    }

    // Check if a tower already exists at this grid position
    const existingTower = this.state.towers.find(t =>
      t.position.x === position.x && t.position.y === position.y
    );

    if (existingTower) {
      this.playerSockets.get(playerId)?.emit('error', 'Position already occupied');
      return;
    }

    // Deduct cost
    player.gold -= towerData.cost;

    // Create tower
    const tower: Tower = {
      id: this.generateId(),
      ownerId: playerId,
      type,
      position,
      health: 100,
      level: 1
    };

    this.state.towers.push(tower);

    this.io.to(this.id).emit('towerPlaced', tower);
    this.broadcastGameState();
  }

  sendMinion(playerId: string, type: MinionType): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return;

    const minionData = GAME_CONFIG.MINION_DATA[type];

    // Check if player has enough gold
    if (player.gold < minionData.cost) {
      this.playerSockets.get(playerId)?.emit('error', 'Not enough gold');
      return;
    }

    // Deduct cost
    player.gold -= minionData.cost;

    // Determine spawn position and target
    const targetSide = player.side === 'left' ? 'right' : 'left';
    const spawnX = player.side === 'left' ? 200 : GAME_CONFIG.CANVAS_WIDTH - 200;
    const laneY = [
      GAME_CONFIG.CANVAS_HEIGHT * 0.3,
      GAME_CONFIG.CANVAS_HEIGHT * 0.5,
      GAME_CONFIG.CANVAS_HEIGHT * 0.7
    ];
    const spawnY = laneY[Math.floor(Math.random() * laneY.length)];

    // Create minion
    const minion: Minion = {
      id: this.generateId(),
      senderId: playerId,
      type,
      position: { x: spawnX, y: spawnY },
      health: minionData.health,
      targetSide
    };

    this.state.minions.push(minion);

    this.io.to(this.id).emit('minionSpawned', minion);
    this.broadcastGameState();
  }

  setPlayerReady(playerId: string): void {
    this.playersReady.add(playerId);
    console.log(`Player ${playerId} is ready (${this.playersReady.size}/${this.state.players.length})`);

    // Start game if both players are ready
    if (this.playersReady.size === this.state.players.length && this.state.players.length === 2) {
      this.startGame();
    } else {
      // Broadcast updated state so clients know who's ready
      this.broadcastGameState();
    }
  }

  startGame(): void {
    if (this.state.players.length < 2) return;

    this.state.state = GameState.PLAYING;
    this.broadcastGameState();

    // Start game loop
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000 / 30); // 30 FPS

    // Start gold generation
    this.goldInterval = setInterval(() => {
      this.generateGold();
    }, 1000); // Every second

    console.log(`Game started in room ${this.id}`);
  }

  private update(): void {
    if (this.state.state !== GameState.PLAYING) return;

    // Update minions
    const minionsToRemove: string[] = [];

    this.state.minions.forEach(minion => {
      const minionData = GAME_CONFIG.MINION_DATA[minion.type];
      const moveSpeed = minionData.speed / 30; // Per frame at 30 FPS

      // Move minion
      if (minion.targetSide === 'left') {
        minion.position.x -= moveSpeed;

        // Check if reached left base
        if (minion.position.x <= 150) {
          const leftPlayer = this.state.players.find(p => p.side === 'left');
          if (leftPlayer) {
            leftPlayer.health -= 10;
            if (leftPlayer.health <= 0) {
              const rightPlayer = this.state.players.find(p => p.side === 'right');
              this.endGame(rightPlayer?.id || '');
            }
          }
          minionsToRemove.push(minion.id);
        }
      } else {
        minion.position.x += moveSpeed;

        // Check if reached right base
        if (minion.position.x >= GAME_CONFIG.CANVAS_WIDTH - 150) {
          const rightPlayer = this.state.players.find(p => p.side === 'right');
          if (rightPlayer) {
            rightPlayer.health -= 10;
            if (rightPlayer.health <= 0) {
              const leftPlayer = this.state.players.find(p => p.side === 'left');
              this.endGame(leftPlayer?.id || '');
            }
          }
          minionsToRemove.push(minion.id);
        }
      }

      // Check tower attacks
      this.state.towers.forEach(tower => {
        // Skip if tower would attack friendly minions
        if (tower.ownerId === minion.senderId) {
          return; // Don't attack your own minions
        }

        const towerData = GAME_CONFIG.TOWER_DATA[tower.type];
        const distance = Math.sqrt(
          Math.pow(tower.position.x - minion.position.x, 2) +
          Math.pow(tower.position.y - minion.position.y, 2)
        );

        if (distance <= towerData.range) {
          // Tower in range, deal damage (simplified, should use attack speed)
          minion.health -= towerData.damage / 30; // Spread damage over frames

          if (minion.health <= 0) {
            minionsToRemove.push(minion.id);

            // Reward the tower owner
            const towerOwner = this.state.players.find(p => p.id === tower.ownerId);
            if (towerOwner) {
              towerOwner.gold += minionData.reward;
            }
          }
        }
      });
    });

    // Remove dead minions
    minionsToRemove.forEach(id => {
      this.state.minions = this.state.minions.filter(m => m.id !== id);
      this.io.to(this.id).emit('entityDestroyed', id);
    });

    // Broadcast state every 5 frames (6 times per second at 30 FPS)
    this.updateCounter++;
    if (this.updateCounter >= 5) {
      this.broadcastGameState();
      this.updateCounter = 0;
    }
  }

  private generateGold(): void {
    this.state.players.forEach(player => {
      player.gold += GAME_CONFIG.GOLD_PER_SECOND;
    });
    // Broadcast updated gold to all clients
    this.broadcastGameState();
  }

  private endGame(winnerId: string): void {
    this.state.state = GameState.FINISHED;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.goldInterval) {
      clearInterval(this.goldInterval);
    }

    this.io.to(this.id).emit('gameOver', winnerId);
    this.broadcastGameState();

    console.log(`Game ended in room ${this.id}, winner: ${winnerId}`);
  }

  private broadcastGameState(): void {
    this.io.to(this.id).emit('gameState', this.state);
  }

  getPlayerCount(): number {
    return this.state.players.length;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    if (this.goldInterval) {
      clearInterval(this.goldInterval);
    }

    console.log(`Room ${this.id} destroyed`);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
