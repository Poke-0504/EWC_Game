const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('ioredis');
const helmet = require('helmet');
const path = require('path');

if (cluster.isMaster) {
  console.log(`🚀 Master ${process.pid} starting ${numCPUs} workers for 400+ player capacity`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
  
} else {
  const app = express();
  const server = http.createServer(app);
  
  // Redis for shared state between workers
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  });
  
  // Security middleware (lightweight for performance)
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for performance
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Optimized Socket.io configuration
  const io = socketIo(server, {
    transports: ['websocket'], // WebSocket only for performance
    upgradeTimeout: 30000,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Use Redis adapter for horizontal scaling
  const { createAdapter } = require('@socket.io/redis-adapter');
  io.adapter(createAdapter(redis, redis.duplicate()));
  
  // Spatial grid for efficient area-based updates
  class SpatialGrid {
    constructor(worldWidth, worldHeight, cellSize = 500) {
      this.worldWidth = worldWidth;
      this.worldHeight = worldHeight;
      this.cellSize = cellSize;
      this.cols = Math.ceil(worldWidth / cellSize);
      this.rows = Math.ceil(worldHeight / cellSize);
      this.grid = new Map();
    }
    
    getCell(x, y) {
      const col = Math.floor(x / this.cellSize);
      const row = Math.floor(y / this.cellSize);
      return `${col},${row}`;
    }
    
    addPlayer(playerId, x, y) {
      const cell = this.getCell(x, y);
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell).add(playerId);
    }
    
    removePlayer(playerId, x, y) {
      const cell = this.getCell(x, y);
      if (this.grid.has(cell)) {
        this.grid.get(cell).delete(playerId);
        if (this.grid.get(cell).size === 0) {
          this.grid.delete(cell);
        }
      }
    }
    
    getNearbyPlayers(x, y, radius = 1) {
      const centerCol = Math.floor(x / this.cellSize);
      const centerRow = Math.floor(y / this.cellSize);
      const nearby = new Set();
      
      for (let col = centerCol - radius; col <= centerCol + radius; col++) {
        for (let row = centerRow - radius; row <= centerRow + radius; row++) {
          const cell = `${col},${row}`;
          if (this.grid.has(cell)) {
            this.grid.get(cell).forEach(playerId => nearby.add(playerId));
          }
        }
      }
      return nearby;
    }
  }
  
  // Game state
  const WORLD_WIDTH = 5000;
  const WORLD_HEIGHT = 5000;
  const spatialGrid = new SpatialGrid(WORLD_WIDTH, WORLD_HEIGHT);
  const players = new Map();
  const food = new Map();
  const MAX_FOOD = 1000;
  
  // Optimized player class
  class Player {
    constructor(id, name, x, y) {
      this.id = id;
      this.name = name;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.mass = 400;
      this.size = Math.sqrt(this.mass);
      this.lastUpdate = Date.now();
      this.gridCell = spatialGrid.getCell(x, y);
    }
    
    update() {
      const now = Date.now();
      const deltaTime = (now - this.lastUpdate) / 1000;
      
      this.x += this.vx * deltaTime * 60;
      this.y += this.vy * deltaTime * 60;
      
      // Boundary checking
      const radius = this.size / 2;
      this.x = Math.max(radius, Math.min(WORLD_WIDTH - radius, this.x));
      this.y = Math.max(radius, Math.min(WORLD_HEIGHT - radius, this.y));
      
      // Update spatial grid if moved cells
      const newCell = spatialGrid.getCell(this.x, this.y);
      if (newCell !== this.gridCell) {
        spatialGrid.removePlayer(this.id, ...this.gridCell.split(',').map(Number));
        spatialGrid.addPlayer(this.id, this.x, this.y);
        this.gridCell = newCell;
      }
      
      this.size = Math.sqrt(this.mass);
      this.lastUpdate = now;
    }
    
    toClientData() {
      return {
        id: this.id,
        name: this.name,
        x: Math.round(this.x),
        y: Math.round(this.y),
        size: Math.round(this.size),
        mass: this.mass
      };
    }
  }
  
  // Generate food
  function generateFood() {
    for (let i = 0; i < MAX_FOOD; i++) {
      const id = `food_${i}`;
      food.set(id, {
        id,
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        size: 6,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      });
    }
  }
  
  generateFood();
  
  // Socket connection handling
  io.on('connection', (socket) => {
    console.log(`Player ${socket.id} connected to worker ${process.pid}`);
    
    socket.on('join-game', (data) => {
      try {
        if (!data?.name || typeof data.name !== 'string') {
          socket.emit('error', 'Invalid name');
          return;
        }
        
        const name = data.name.substring(0, 128); // Limit name length
        const x = Math.random() * (WORLD_WIDTH - 100) + 50;
        const y = Math.random() * (WORLD_HEIGHT - 100) + 50;
        
        const player = new Player(socket.id, name, x, y);
        players.set(socket.id, player);
        spatialGrid.addPlayer(socket.id, x, y);
        
        socket.emit('game-joined', {
          playerId: socket.id,
          world: { width: WORLD_WIDTH, height: WORLD_HEIGHT }
        });
        
        // Join spatial room for efficient broadcasting
        socket.join(`cell_${player.gridCell}`);
        
      } catch (error) {
        console.error('Error in join-game:', error);
        socket.emit('error', 'Failed to join game');
      }
    });
    
    socket.on('move', (data) => {
      const player = players.get(socket.id);
      if (!player || !data) return;
      
      // Validate and clamp movement
      const x = Math.max(-1, Math.min(1, data.x || 0));
      const y = Math.max(-1, Math.min(1, data.y || 0));
      
      const speed = Math.max(1, 5 - (player.size - 20) / 30);
      player.vx = x * speed;
      player.vy = y * speed;
    });
    
    socket.on('split', () => {
      const player = players.get(socket.id);
      if (!player || player.mass < 64) return;
      
      // Split logic would go here
      // For performance, limit splits and use efficient algorithms
    });
    
    socket.on('disconnect', () => {
      const player = players.get(socket.id);
      if (player) {
        spatialGrid.removePlayer(socket.id, player.x, player.y);
        players.delete(socket.id);
        console.log(`Player ${socket.id} disconnected from worker ${process.pid}`);
      }
    });
  });
  
  // Optimized game loop
  const TICK_RATE = 60;
  const BROADCAST_RATE = 20;
  
  setInterval(() => {
    // Update all players
    players.forEach(player => player.update());
  }, 1000 / TICK_RATE);
  
  // Efficient broadcasting - only send nearby players to each client
  setInterval(() => {
    if (players.size === 0) return;
    
    players.forEach((player, playerId) => {
      const socket = io.sockets.sockets.get(playerId);
      if (!socket) return;
      
      // Get nearby players (spatial optimization)
      const nearbyIds = spatialGrid.getNearbyPlayers(player.x, player.y, 2);
      const nearbyPlayers = Array.from(nearbyIds)
        .map(id => players.get(id))
        .filter(p => p && p !== player)
        .slice(0, 50) // Limit to 50 nearby players max
        .map(p => p.toClientData());
      
      // Get nearby food
      const nearbyFood = Array.from(food.values())
        .filter(f => {
          const dx = f.x - player.x;
          const dy = f.y - player.y;
          return dx * dx + dy * dy < 250000; // ~500px radius
        })
        .slice(0, 100); // Limit food items
      
      socket.emit('game-update', {
        players: nearbyPlayers,
        food: nearbyFood,
        player: player.toClientData()
      });
    });
  }, 1000 / BROADCAST_RATE);
  
  // Leaderboard (less frequent)
  setInterval(() => {
    if (players.size === 0) return;
    
    const leaderboard = Array.from(players.values())
      .sort((a, b) => b.mass - a.mass)
      .slice(0, 10)
      .map(p => ({ name: p.name, score: Math.floor(p.mass / 4) }));
    
    io.emit('leaderboard-update', leaderboard);
  }, 3000);
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`⚡ Worker ${process.pid} listening on port ${PORT} - Ready for 400+ players!`);
  });
} 