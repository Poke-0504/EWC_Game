// Game Logic Manager
class GameLogic {
  constructor(app) {
    this.app = app;
    this.paused = false;
    this.interpolation = true;
    
    // Game timers
    this.lastUpdateTime = 0;
    this.gameStartTime = 0;
    
    // Player data
    this.myPlayer = null;
    this.players = new Map();
    this.food = new Map();
    
    // Interpolation data for smooth movement
    this.interpolationData = new Map();
    
    console.log('🎮 GameLogic initialized');
  }

  handleGameUpdate(data) {
    if (!data || this.paused) return;

    const now = performance.now();
    
    // Update players
    if (data.players) {
      this.updatePlayers(data.players, now);
    }
    
    // Update food
    if (data.food) {
      this.updateFood(data.food);
    }
    
    // Update my player reference
    this.updateMyPlayer();
    
    // Update stats
    this.app.stats.playersOnline = this.players.size;
    
    this.lastUpdateTime = now;
  }

  updatePlayers(playersData, timestamp) {
    const gameState = this.app.getGameState();
    
    // Clear old players
    const currentPlayerIds = new Set(playersData.map(p => p.id));
    for (const [id, player] of this.players) {
      if (!currentPlayerIds.has(id)) {
        this.players.delete(id);
        gameState.players.delete(id);
        this.interpolationData.delete(id);
      }
    }
    
    // Update existing and add new players
    playersData.forEach(playerData => {
      const existingPlayer = this.players.get(playerData.id);
      
      if (existingPlayer) {
        // Store previous position for interpolation
        if (this.interpolation) {
          this.interpolationData.set(playerData.id, {
            fromX: existingPlayer.x,
            fromY: existingPlayer.y,
            toX: playerData.x,
            toY: playerData.y,
            fromSize: existingPlayer.size,
            toSize: playerData.size,
            startTime: timestamp
          });
        }
        
        // Update player data
        Object.assign(existingPlayer, playerData);
      } else {
        // New player
        const player = this.createPlayer(playerData);
        this.players.set(playerData.id, player);
        gameState.players.set(playerData.id, player);
      }
    });
  }

  updateFood(foodData) {
    const gameState = this.app.getGameState();
    
    // Clear old food
    gameState.food.clear();
    this.food.clear();
    
    // Add new food
    foodData.forEach(foodItem => {
      const food = {
        id: foodItem.id,
        x: foodItem.x,
        y: foodItem.y,
        size: foodItem.size,
        color: foodItem.color,
        type: 'food'
      };
      
      this.food.set(foodItem.id, food);
      gameState.food.set(foodItem.id, food);
    });
  }

  createPlayer(playerData) {
    return {
      id: playerData.id,
      name: playerData.name,
      x: playerData.x,
      y: playerData.y,
      size: playerData.size,
      color: playerData.color,
      score: playerData.score || 0,
      alive: playerData.alive !== false,
      invulnerable: playerData.invulnerable || false,
      type: 'player',
      // Visual properties
      targetX: playerData.x,
      targetY: playerData.y,
      targetSize: playerData.size,
      renderX: playerData.x,
      renderY: playerData.y,
      renderSize: playerData.size
    };
  }

  updateMyPlayer() {
    const gameState = this.app.getGameState();
    if (!gameState.player) return;
    
    const myPlayer = this.players.get(gameState.player.id);
    if (myPlayer) {
      this.myPlayer = myPlayer;
      
      // Update camera to follow player
      this.updateCamera(myPlayer);
      
      // Update UI with player score
      this.app.ui.updatePlayerScore(myPlayer.score || 0);
      
      // Check if player died
      if (!myPlayer.alive) {
        this.handlePlayerDeath(myPlayer);
      }
    }
  }

  updateCamera(player) {
    const gameState = this.app.getGameState();
    const canvas = this.app.renderer.canvas;
    
    if (!player || !canvas) return;
    
    // Calculate zoom based on player size (bigger = more zoomed out)
    const baseZoom = 1.0;
    const sizeZoomFactor = 0.002;
    const targetZoom = Math.max(0.5, Math.min(2.0, baseZoom - (player.size - 20) * sizeZoomFactor));
    
    // Smooth zoom transition
    gameState.camera.zoom += (targetZoom - gameState.camera.zoom) * 0.1;
    
    // Center camera on player
    const targetX = player.renderX - (canvas.width / 2) / gameState.camera.zoom;
    const targetY = player.renderY - (canvas.height / 2) / gameState.camera.zoom;
    
    // Smooth camera movement
    gameState.camera.x += (targetX - gameState.camera.x) * 0.1;
    gameState.camera.y += (targetY - gameState.camera.y) * 0.1;
    
    // Constrain camera to world bounds
    const worldBounds = gameState.world;
    const cameraWidth = canvas.width / gameState.camera.zoom;
    const cameraHeight = canvas.height / gameState.camera.zoom;
    
    gameState.camera.x = Math.max(0, Math.min(worldBounds.width - cameraWidth, gameState.camera.x));
    gameState.camera.y = Math.max(0, Math.min(worldBounds.height - cameraHeight, gameState.camera.y));
  }

  handlePlayerDeath(player) {
    console.log('💀 Player died:', player.name);
    
    // Calculate time alive
    const timeAlive = this.gameStartTime ? (Date.now() - this.gameStartTime) / 1000 : 0;
    
    // Show death screen
    this.app.ui.showDeathScreen({
      score: player.score || 0,
      kills: player.kills || 0,
      timeAlive: Math.floor(timeAlive)
    });
    
    // Stop playing
    this.app.gameState.playing = false;
  }

  update(deltaTime) {
    if (this.paused) return;
    
    // Update interpolation
    if (this.interpolation) {
      this.updateInterpolation(deltaTime);
    }
    
    // Update camera smoothness
    if (this.myPlayer) {
      this.updateCamera(this.myPlayer);
    }
    
    // Send movement updates based on input
    this.handleMovementInput();
  }

  updateInterpolation(deltaTime) {
    const now = performance.now();
    const interpolationTime = 100; // 100ms interpolation
    
    for (const [playerId, player] of this.players) {
      const interpData = this.interpolationData.get(playerId);
      if (!interpData) {
        // No interpolation data, just use target positions
        player.renderX = player.x;
        player.renderY = player.y;
        player.renderSize = player.size;
        continue;
      }
      
      // Calculate interpolation progress
      const elapsed = now - interpData.startTime;
      const progress = Math.min(1, elapsed / interpolationTime);
      
      // Smooth interpolation using easing
      const easedProgress = this.easeOutCubic(progress);
      
      // Interpolate position
      player.renderX = this.lerp(interpData.fromX, interpData.toX, easedProgress);
      player.renderY = this.lerp(interpData.fromY, interpData.toY, easedProgress);
      player.renderSize = this.lerp(interpData.fromSize, interpData.toSize, easedProgress);
      
      // Clean up completed interpolations
      if (progress >= 1) {
        this.interpolationData.delete(playerId);
      }
    }
  }

  handleMovementInput() {
    if (!this.myPlayer || !this.app.input) return;
    
    const mousePos = this.app.input.getMousePosition();
    const gameState = this.app.getGameState();
    
    if (mousePos) {
      // Convert screen coordinates to world coordinates
      const worldX = (mousePos.x / gameState.camera.zoom) + gameState.camera.x;
      const worldY = (mousePos.y / gameState.camera.zoom) + gameState.camera.y;
      
      // Calculate movement vector relative to player
      const dx = worldX - this.myPlayer.renderX;
      const dy = worldY - this.myPlayer.renderY;
      
      // Normalize and send to server
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        
        this.app.sendMovement(normalizedX, normalizedY);
      }
    }
  }

  // Utility functions
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  getVisibleEntities() {
    const gameState = this.app.getGameState();
    const camera = gameState.camera;
    const canvas = this.app.renderer.canvas;
    
    if (!canvas) return { players: [], food: [] };
    
    // Calculate visible area
    const viewPadding = 200; // Extra padding to avoid pop-in
    const visibleArea = {
      left: camera.x - viewPadding,
      right: camera.x + (canvas.width / camera.zoom) + viewPadding,
      top: camera.y - viewPadding,
      bottom: camera.y + (canvas.height / camera.zoom) + viewPadding
    };
    
    // Filter visible players
    const visiblePlayers = [];
    for (const [id, player] of this.players) {
      if (this.isEntityVisible(player, visibleArea)) {
        visiblePlayers.push(player);
      }
    }
    
    // Filter visible food
    const visibleFood = [];
    for (const [id, food] of this.food) {
      if (this.isEntityVisible(food, visibleArea)) {
        visibleFood.push(food);
      }
    }
    
    return { players: visiblePlayers, food: visibleFood };
  }

  isEntityVisible(entity, visibleArea) {
    const radius = (entity.size || 10) / 2;
    return (
      entity.renderX + radius > visibleArea.left &&
      entity.renderX - radius < visibleArea.right &&
      entity.renderY + radius > visibleArea.top &&
      entity.renderY - radius < visibleArea.bottom
    );
  }

  startGame() {
    this.gameStartTime = Date.now();
    this.paused = false;
    console.log('🎮 Game started');
  }

  pause() {
    this.paused = true;
    console.log('⏸️ Game paused');
  }

  resume() {
    this.paused = false;
    console.log('▶️ Game resumed');
  }

  reset() {
    this.players.clear();
    this.food.clear();
    this.interpolationData.clear();
    this.myPlayer = null;
    this.gameStartTime = 0;
    
    const gameState = this.app.getGameState();
    gameState.players.clear();
    gameState.food.clear();
    
    console.log('🔄 Game reset');
  }

  // Debug methods
  getDebugInfo() {
    return {
      players: this.players.size,
      food: this.food.size,
      interpolationData: this.interpolationData.size,
      paused: this.paused,
      myPlayer: this.myPlayer ? this.myPlayer.id : null
    };
  }
} 