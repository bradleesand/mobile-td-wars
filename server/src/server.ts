import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { GameManager } from './game/GameManager';

const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: '*', // In production, specify exact origins
  methods: ['GET', 'POST']
}));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const gameManager = new GameManager(io);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: gameManager.getRoomCount() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', (playerName, callback) => {
    const roomId = gameManager.createRoom(socket, playerName);
    callback(roomId);
    console.log(`Room created: ${roomId} by ${playerName}`);
  });

  socket.on('joinRoom', (roomId, playerName, callback) => {
    const success = gameManager.joinRoom(socket, roomId, playerName);
    callback(success);
    if (success) {
      console.log(`${playerName} joined room: ${roomId}`);
    }
  });

  socket.on('placeTower', (type, position) => {
    gameManager.handlePlaceTower(socket, type, position);
  });

  socket.on('sendEnemy', (type) => {
    gameManager.handleSendEnemy(socket, type);
  });

  socket.on('ready', () => {
    gameManager.handlePlayerReady(socket);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    gameManager.handleDisconnect(socket);
  });
});

const PORT = parseInt(process.env.PORT || '3000', 10);

httpServer.listen(PORT, () => {
  console.log(`🚀 Mobile TD Wars Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 Server listening on all interfaces`);
});
