// Shared types between client and server

export interface Vector2 {
  x: number;
  y: number;
}

export enum GameState {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum TowerType {
  ARCHER = 'ARCHER',
  CANNON = 'CANNON',
  MAGIC = 'MAGIC',
  SNIPER = 'SNIPER'
}

export enum MinionType {
  SCOUT = 'SCOUT',
  WARRIOR = 'WARRIOR',
  TANK = 'TANK',
  BOSS = 'BOSS'
}

export interface TowerData {
  type: TowerType;
  cost: number;
  damage: number;
  range: number;
  attackSpeed: number; // attacks per second
  specialEffect?: string;
}

export interface MinionData {
  type: MinionType;
  cost: number;
  health: number;
  speed: number;
  reward: number; // gold reward for opponent when killed
}

export interface Player {
  id: string;
  name: string;
  health: number;
  gold: number;
  side: 'left' | 'right';
}

export interface Tower {
  id: string;
  ownerId: string;
  type: TowerType;
  position: Vector2;
  health: number;
  level: number;
}

export interface Minion {
  id: string;
  senderId: string;
  type: MinionType;
  position: Vector2;
  health: number;
  targetSide: 'left' | 'right';
  path?: Vector2[]; // Pathfinding waypoints
}

export interface GameRoom {
  id: string;
  players: Player[];
  towers: Tower[];
  minions: Minion[];
  state: GameState;
  createdAt: number;
}

// Socket.io event types
export interface ServerToClientEvents {
  gameState: (room: GameRoom) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  towerPlaced: (tower: Tower) => void;
  minionSpawned: (minion: Minion) => void;
  entityUpdated: (entity: Partial<Tower | Minion> & { id: string }) => void;
  entityDestroyed: (id: string) => void;
  gameOver: (winnerId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, callback: (roomId: string) => void) => void;
  joinRoom: (roomId: string, playerName: string, callback: (success: boolean) => void) => void;
  placeTower: (type: TowerType, position: Vector2) => void;
  sendMinion: (type: MinionType) => void;
  ready: () => void;
}

// Game constants
export const GAME_CONFIG = {
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  BASE_HEALTH: 100,
  STARTING_GOLD: 500,
  GOLD_PER_SECOND: 10,
  TOWER_DATA: {
    [TowerType.ARCHER]: {
      type: TowerType.ARCHER,
      cost: 100,
      damage: 10,
      range: 200,
      attackSpeed: 2
    },
    [TowerType.CANNON]: {
      type: TowerType.CANNON,
      cost: 200,
      damage: 50,
      range: 150,
      attackSpeed: 0.5
    },
    [TowerType.MAGIC]: {
      type: TowerType.MAGIC,
      cost: 150,
      damage: 15,
      range: 180,
      attackSpeed: 1.5,
      specialEffect: 'slow'
    },
    [TowerType.SNIPER]: {
      type: TowerType.SNIPER,
      cost: 250,
      damage: 100,
      range: 400,
      attackSpeed: 0.33
    }
  } as Record<TowerType, TowerData>,
  MINION_DATA: {
    [MinionType.SCOUT]: {
      type: MinionType.SCOUT,
      cost: 50,
      health: 50,
      speed: 150,
      reward: 25
    },
    [MinionType.WARRIOR]: {
      type: MinionType.WARRIOR,
      cost: 100,
      health: 150,
      speed: 80,
      reward: 50
    },
    [MinionType.TANK]: {
      type: MinionType.TANK,
      cost: 200,
      health: 400,
      speed: 50,
      reward: 100
    },
    [MinionType.BOSS]: {
      type: MinionType.BOSS,
      cost: 500,
      health: 1000,
      speed: 30,
      reward: 250
    }
  } as Record<MinionType, MinionData>,
  GRID_SIZE: 60, // Grid cell size for tower placement
  TOWER_SIZE: 50 // Visual size of towers
};
