const Player = require('./Player');
const Food = require('./Food');

class GameWorld {
  constructor(config) {
    this.config = config;
    this.width = config.world.width;
    this.height = config.world.height;
    
    this.players = new Map();
    this.food = new Map();
    
    this.lastUpdate = Date.now();
    this.gameStartTime = Date.now();
    
    // Initialize food
    this.spawnInitialFood();
    
    console.log(`🌍 GameWorld initialized: ${this.width}x${this.height}`);
    console.log(`🍎 Initial food spawned: ${this.food.size} items`);
  }

  // Add a player to the game
  addPlayer(player) {
    // Find a safe spawn position
    const spawnPos = this.findSafeSpawnPosition();
    player.spawn(spawnPos.x, spawnPos.y);
    
    this.players.set(player.id, player);
    
    console.log(`➕ Player added: ${player.name} at (${spawnPos.x}, ${spawnPos.y})`);
  }

  // Remove a player from the game
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      // Create food explosion when player dies
      this.createFoodExplosion(player.x, player.y, player.mass);
      this.players.delete(playerId);
      console.log(`➖ Player removed: ${player.name}`);
    }
  }

  // Find a safe position to spawn a player
  findSafeSpawnPosition() {
    const maxAttempts = 10;
    const minDistance = 200; // Minimum distance from other players
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.random() * (this.width - 200) + 100;
      const y = Math.random() * (this.height - 200) + 100;
      
      let safe = true;
      for (const [id, player] of this.players) {
        if (!player.alive) continue;
        
        const dx = x - player.x;
        const dy = y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          safe = false;
          break;
        }
      }
      
      if (safe) {
        return { x, y };
      }
    }
    
    // If no safe position found, return a random position
    return {
      x: Math.random() * (this.width - 200) + 100,
      y: Math.random() * (this.height - 200) + 100
    };
  }

  // Update player movement
  updatePlayerMovement(playerId, targetX, targetY) {
    const player = this.players.get(playerId);
    if (player && player.alive) {
      // Convert relative movement to absolute world coordinates
      const worldX = player.x + targetX * 200; // Scale factor for responsiveness
      const worldY = player.y + targetY * 200;
      
      player.updateMovement(worldX, worldY);
    }
  }

  // Handle player split
  splitPlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    const splitData = player.split();
    if (splitData) {
      // For now, we just do the split on the existing player
      // In a more complex system, we'd create multiple cells per player
      console.log(`💥 Player split: ${player.name}`);
    }
  }

  // Main game update loop
  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
    this.lastUpdate = now;

    // Update all players
    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      
      player.update(deltaTime);
      player.constrainToWorld(this.width, this.height);
    }

    // Check collisions
    this.checkCollisions();
    
    // Maintain food population
    this.maintainFood();
  }

  // Check all collisions in the game
  checkCollisions() {
    const playerArray = Array.from(this.players.values()).filter(p => p.alive);
    
    // Player vs Food collisions
    for (const player of playerArray) {
      for (const [foodId, food] of this.food) {
        if (food.eaten) continue;
        
        if (food.collidesWith(player)) {
          player.eatFood(food);
          food.eat();
          this.food.delete(foodId);
        }
      }
    }

    // Player vs Player collisions
    for (let i = 0; i < playerArray.length; i++) {
      for (let j = i + 1; j < playerArray.length; j++) {
        const player1 = playerArray[i];
        const player2 = playerArray[j];
        
        if (player1.collidesWith(player2)) {
          // Determine who eats who
          if (player1.canEat(player2)) {
            player1.eat(player2);
            this.createFoodExplosion(player2.x, player2.y, player2.mass);
          } else if (player2.canEat(player1)) {
            player2.eat(player1);
            this.createFoodExplosion(player1.x, player1.y, player1.mass);
          }
        }
      }
    }
  }

  // Create food explosion when a player dies
  createFoodExplosion(x, y, mass) {
    const foodCount = Math.min(Math.floor(mass / 20), 20); // Max 20 food pieces
    
    for (let i = 0; i < foodCount; i++) {
      const angle = (Math.PI * 2 * i) / foodCount;
      const distance = 50 + Math.random() * 100;
      
      const foodX = x + Math.cos(angle) * distance;
      const foodY = y + Math.sin(angle) * distance;
      
      // Ensure food stays within world bounds
      const clampedX = Math.max(10, Math.min(this.width - 10, foodX));
      const clampedY = Math.max(10, Math.min(this.height - 10, foodY));
      
      const food = Food.createAt(clampedX, clampedY, 8, 2); // Bigger food from players
      this.food.set(food.id, food);
    }
  }

  // Spawn initial food
  spawnInitialFood() {
    const targetCount = this.config.food.count;
    
    for (let i = 0; i < targetCount; i++) {
      const food = Food.createRandom(this.width, this.height, this.config.food.size);
      this.food.set(food.id, food);
    }
  }

  // Maintain food population
  maintainFood() {
    const targetCount = this.config.food.count;
    const currentCount = this.food.size;
    
    if (currentCount < targetCount) {
      const spawnCount = Math.min(5, targetCount - currentCount); // Spawn max 5 per update
      
      for (let i = 0; i < spawnCount; i++) {
        const food = Food.createRandom(this.width, this.height, this.config.food.size);
        this.food.set(food.id, food);
      }
    }
  }

  // Get game state for clients
  getGameState() {
    const players = [];
    const food = [];

    // Get all alive players
    for (const [id, player] of this.players) {
      if (player.alive && player.spawned) {
        players.push(player.getVisibleData());
      }
    }

    // Get visible food (limit to prevent network overload)
    const foodArray = Array.from(this.food.values());
    const visibleFood = foodArray.slice(0, 500); // Limit to 500 food items per update
    
    for (const foodItem of visibleFood) {
      if (!foodItem.eaten) {
        food.push(foodItem.getClientData());
      }
    }

    return {
      players,
      food,
      timestamp: Date.now()
    };
  }

  // Get leaderboard
  getLeaderboard() {
    const players = Array.from(this.players.values())
      .filter(p => p.alive && p.spawned)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.leaderboard.maxEntries);

    return players.map(p => ({
      name: p.name,
      score: p.score,
      kills: p.kills
    }));
  }

  // Get game statistics
  getStats() {
    const alivePlayers = Array.from(this.players.values()).filter(p => p.alive).length;
    
    return {
      totalPlayers: this.players.size,
      alivePlayers: alivePlayers,
      totalFood: this.food.size,
      uptime: Date.now() - this.gameStartTime,
      worldSize: {
        width: this.width,
        height: this.height
      }
    };
  }

  // Clean up dead entities
  cleanup() {
    // Remove eaten food
    for (const [id, food] of this.food) {
      if (food.eaten) {
        this.food.delete(id);
      }
    }

    // Remove disconnected players (handled in server)
  }

  // Get world boundaries for a player (for client camera)
  getWorldBounds() {
    return {
      minX: 0,
      minY: 0,
      maxX: this.width,
      maxY: this.height
    };
  }

  // Validate player position (anti-cheat)
  validatePlayerPosition(playerId, x, y) {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Check if position is within world bounds
    if (x < 0 || x > this.width || y < 0 || y > this.height) {
      return false;
    }

    // Check if movement is physically possible
    const dx = Math.abs(x - player.x);
    const dy = Math.abs(y - player.y);
    const maxMovement = player.getSpeed() * 2; // Allow some tolerance

    if (dx > maxMovement || dy > maxMovement) {
      console.warn(`⚠️  Suspicious movement detected for player ${player.name}`);
      return false;
    }

    return true;
  }
}

module.exports = GameWorld; 