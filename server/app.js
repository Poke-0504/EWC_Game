const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sanitizeHtml = require('sanitize-html');

const GameWorld = require('./game/GameWorld');
const Player = require('./game/Player');
const config = require('./config');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.socket.io"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : true,
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Socket.io with rate limiting
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? 'your-domain.com' : true,
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {}
});

// Initialize game world
const gameWorld = new GameWorld(config);

// Socket connection rate limiting
const connectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 socket connections per minute
  message: 'Too many connection attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

// Store players
const players = new Map();
const sockets = new Map();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Rate limit socket events
  const socketLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 10, // max 10 events per second per socket
    message: 'Rate limit exceeded',
    standardHeaders: false,
    legacyHeaders: false,
  });

  socket.on('join-game', (data) => {
    try {
      // Validate and sanitize input
      if (!data || typeof data.name !== 'string') {
        socket.emit('error', 'Invalid player data');
        return;
      }

      const sanitizedName = sanitizeHtml(data.name.trim(), {
        allowedTags: [],
        allowedAttributes: {}
      });

      if (!sanitizedName || sanitizedName.length < 1 || sanitizedName.length > 20) {
        socket.emit('error', 'Invalid name. Must be 1-20 characters.');
        return;
      }

      // Create new player
      const player = new Player(socket.id, sanitizedName);
      players.set(socket.id, player);
      sockets.set(socket.id, socket);
      gameWorld.addPlayer(player);

      socket.emit('game-joined', {
        playerId: socket.id,
        world: {
          width: config.world.width,
          height: config.world.height
        }
      });

      // Broadcast new player to others
      socket.broadcast.emit('player-joined', {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        size: player.size
      });

      console.log(`Player ${sanitizedName} joined the game`);
    } catch (error) {
      console.error('Error in join-game:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  socket.on('move', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player || !data) return;

      // Validate movement data
      if (typeof data.x !== 'number' || typeof data.y !== 'number') return;
      
      // Clamp values to prevent cheating
      const x = Math.max(-1, Math.min(1, data.x));
      const y = Math.max(-1, Math.min(1, data.y));
      
      gameWorld.updatePlayerMovement(player.id, x, y);
    } catch (error) {
      console.error('Error in move:', error);
    }
  });

  socket.on('split', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      
      gameWorld.splitPlayer(player.id);
    } catch (error) {
      console.error('Error in split:', error);
    }
  });

  socket.on('chat', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player || !data || typeof data.message !== 'string') return;

      const sanitizedMessage = sanitizeHtml(data.message.trim(), {
        allowedTags: [],
        allowedAttributes: {}
      });

      if (!sanitizedMessage || sanitizedMessage.length > 100) return;

      // Broadcast chat message
      io.emit('chat-message', {
        playerId: player.id,
        playerName: player.name,
        message: sanitizedMessage,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in chat:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      const player = players.get(socket.id);
      if (player) {
        gameWorld.removePlayer(player.id);
        players.delete(socket.id);
        sockets.delete(socket.id);

        // Notify other players
        socket.broadcast.emit('player-left', {
          id: player.id,
          name: player.name
        });

        console.log(`Player ${player.name} left the game`);
      }
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Game loop
const TICK_RATE = 60; // 60 FPS
const BROADCAST_RATE = 20; // 20 updates per second to clients

setInterval(() => {
  gameWorld.update();
}, 1000 / TICK_RATE);

// Broadcast game state to clients
setInterval(() => {
  if (players.size === 0) return;

  const gameState = gameWorld.getGameState();
  io.emit('game-update', gameState);
}, 1000 / BROADCAST_RATE);

// Broadcast leaderboard
setInterval(() => {
  if (players.size === 0) return;
  
  const leaderboard = gameWorld.getLeaderboard();
  io.emit('leaderboard-update', leaderboard);
}, 2000); // Every 2 seconds

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || config.server.port || 3000;
const HOST = process.env.HOST || config.server.host || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🎮 Cursor.io server running on http://${HOST}:${PORT}`);
  console.log(`🌍 Game world: ${config.world.width}x${config.world.height}`);
  console.log(`⚙️  Tick rate: ${TICK_RATE}fps, Broadcast rate: ${BROADCAST_RATE}fps`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 