# Mobile TD Wars

A real-time multiplayer tower defense game where players battle head-to-head, sending waves of enemies to attack each other while defending their own base with strategic tower placements.

## Features

- **Real-time Multiplayer**: Battle against other players in real-time
- **Strategic Gameplay**: Build towers to defend and send enemies to attack
- **Mobile-First**: Optimized for mobile devices (iOS & Android)
- **Cross-Platform**: Play on web, iOS, or Android

## Tech Stack

- **Client**: Phaser 3 + TypeScript + Vite
- **Server**: Node.js + Socket.io
- **Mobile**: Capacitor
- **Language**: TypeScript

## Project Structure

```
mobile-td-wars/
├── client/          # Game client (Phaser)
├── server/          # Multiplayer server (Socket.io)
├── shared/          # Shared types and constants
└── capacitor.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- For mobile builds: Xcode (iOS) or Android Studio (Android)

### Installation

```bash
# Install dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### Development

```bash
# Start the server (terminal 1)
npm run server

# Start the client (terminal 2)
npm run client

# Or run both concurrently
npm run dev
```

The game will be available at `http://localhost:5173`

### Building for Mobile

```bash
# Build client
npm run build:client

# iOS
npm run ios

# Android
npm run android
```

## Game Mechanics

### Core Gameplay

1. **Resources**: Players earn gold over time and from defeating enemies
2. **Towers**: Build defensive towers on your side to stop enemy waves
3. **Enemies**: Send enemies toward your opponent's base
4. **Victory**: Destroy opponent's base or survive the longest

### Tower Types

- **Archer Tower**: Fast attack speed, moderate damage
- **Cannon Tower**: Slow attack, high area damage
- **Magic Tower**: Special effects (slow, poison, etc.)
- **Sniper Tower**: Long range, high single-target damage

### Enemy Types

- **Scout**: Fast, low health
- **Warrior**: Balanced stats
- **Tank**: Slow, high health
- **Boss**: Very strong, expensive to send

## Development Roadmap

- [x] Project setup
- [ ] Core game mechanics
- [ ] Multiplayer synchronization
- [ ] UI/UX polish
- [ ] Mobile optimization
- [ ] Sound effects and music
- [ ] Matchmaking system

## License

MIT
