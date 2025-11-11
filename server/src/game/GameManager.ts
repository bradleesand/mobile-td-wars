import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, TowerType, EnemyType, Vector2 } from '@shared/types';
import { Room } from './Room';

export class GameManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  createRoom(socket: Socket, playerName: string): string {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, this.io);

    // Join room BEFORE addPlayer so socket receives the initial gameState broadcast
    socket.join(roomId);
    this.socketToRoom.set(socket.id, roomId);

    room.addPlayer(socket, playerName, 'left');
    this.rooms.set(roomId, room);

    return roomId;
  }

  joinRoom(socket: Socket, roomId: string, playerName: string): boolean {
    const room = this.rooms.get(roomId);

    if (!room) {
      return false;
    }

    if (room.getPlayerCount() >= 2) {
      return false;
    }

    // Join room BEFORE addPlayer so socket receives the gameState broadcast
    socket.join(roomId);
    this.socketToRoom.set(socket.id, roomId);

    const side = room.getPlayerCount() === 0 ? 'left' : 'right';
    room.addPlayer(socket, playerName, side);

    // Players must click "Ready" to start the game
    // (no auto-start)

    return true;
  }

  handlePlaceTower(socket: Socket, type: TowerType, position: Vector2): void {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.placeTower(socket.id, type, position);
  }

  handleSendEnemy(socket: Socket, type: EnemyType): void {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.sendEnemy(socket.id, type);
  }

  handlePlayerReady(socket: Socket): void {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.setPlayerReady(socket.id);
  }

  handleDisconnect(socket: Socket): void {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.removePlayer(socket.id);

    // Clean up empty rooms
    if (room.getPlayerCount() === 0) {
      room.destroy();
      this.rooms.delete(roomId);
    }

    this.socketToRoom.delete(socket.id);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  private generateRoomId(): string {
    // Use character set excluding confusing characters: O, 0, I, 1
    const chars = '234567892ABCDEFGHJKLMNPQRSTUVWXYZ';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  }
}
