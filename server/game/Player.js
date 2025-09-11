const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;
    this.x = 0;
    this.y = 0;
    this.vx = 0; // velocity x
    this.vy = 0; // velocity y
    this.targetX = 0; // mouse target x
    this.targetY = 0; // mouse target y
    this.size = 20;
    this.mass = 400; // size^2
    this.color = this.getRandomColor();
    this.lastSplit = 0;
    this.lastMove = 0;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.cells = []; // For split mechanics
    this.score = 0;
    this.kills = 0;
    this.alive = true;
    this.spawned = false;
  }

  getRandomColor() {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff9f43', '#10ac84', '#ee5a6f'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  spawn(x, y) {
    this.x = x;
    this.y = y;
    this.size = 20;
    this.mass = 400;
    this.alive = true;
    this.spawned = true;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.vx = 0;
    this.vy = 0;
    this.cells = [];
  }

  updateMovement(targetX, targetY) {
    if (!this.alive) return;

    this.targetX = targetX;
    this.targetY = targetY;
    this.lastMove = Date.now();

    // Calculate movement vector
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Normalize and apply speed based on size (larger = slower)
      const speed = this.getSpeed();
      this.vx = (dx / distance) * speed;
      this.vy = (dy / distance) * speed;
    }
  }

  getSpeed() {
    // Speed decreases as size increases
    const baseSpeed = 5;
    const sizeModifier = Math.max(0.3, 1 - (this.size - 20) / 200);
    return baseSpeed * sizeModifier;
  }

  update(deltaTime) {
    if (!this.alive || !this.spawned) return;

    // Update invulnerability
    if (this.invulnerable) {
      if (Date.now() - this.invulnerabilityStart > 3000) { // 3 seconds
        this.invulnerable = false;
      }
    }

    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    // Apply friction
    this.vx *= 0.95;
    this.vy *= 0.95;

    // Mass loss over time for large players
    if (this.mass > 500) {
      const lossRate = 0.002; // 0.2% per second
      this.mass = Math.max(400, this.mass * (1 - lossRate * deltaTime));
      this.size = Math.sqrt(this.mass);
    }

    // Update score based on mass
    this.score = Math.floor(this.mass / 4);
  }

  canEat(other) {
    if (!this.alive || !other.alive || this === other) return false;
    if (other.invulnerable) return false;

    // Must be 20% larger to eat another player
    const eatRatio = 1.2;
    return this.mass > other.mass * eatRatio;
  }

  eat(other) {
    if (!this.canEat(other)) return false;

    // Gain mass from eating
    this.mass += other.mass * 0.8; // 80% efficiency
    this.size = Math.sqrt(this.mass);
    this.kills++;

    // Kill the other player
    other.die();

    return true;
  }

  eatFood(food) {
    if (!this.alive) return false;

    this.mass += food.nutritionValue || 1;
    this.size = Math.sqrt(this.mass);

    return true;
  }

  split() {
    if (!this.alive || !this.spawned) return false;
    if (Date.now() - this.lastSplit < 3000) return false; // 3 second cooldown
    if (this.mass < 64) return false; // Must have enough mass to split

    this.lastSplit = Date.now();

    // Create split data for client
    const splitAngle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
    const splitDistance = this.size * 2;

    const newMass = this.mass / 2;
    const newSize = Math.sqrt(newMass);

    // Original cell moves backward
    this.mass = newMass;
    this.size = newSize;
    this.x -= Math.cos(splitAngle) * splitDistance;
    this.y -= Math.sin(splitAngle) * splitDistance;

    // Return data for new cell that will be created
    return {
      x: this.x + Math.cos(splitAngle) * splitDistance * 2,
      y: this.y + Math.sin(splitAngle) * splitDistance * 2,
      mass: newMass,
      size: newSize,
      vx: Math.cos(splitAngle) * 8,
      vy: Math.sin(splitAngle) * 8
    };
  }

  die() {
    this.alive = false;
    this.spawned = false;
    this.size = 0;
    this.mass = 0;
  }

  respawn() {
    this.alive = true;
    this.spawned = false;
    this.size = 20;
    this.mass = 400;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.vx = 0;
    this.vy = 0;
    this.cells = [];
    this.score = 0;
  }

  // Check collision with another circle
  collidesWith(other) {
    if (!this.alive || !other.alive) return false;

    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (this.size + other.size) / 2;
  }

  // Get player data for client
  getClientData() {
    return {
      id: this.id,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      size: Math.round(this.size),
      color: this.color,
      score: this.score,
      alive: this.alive,
      invulnerable: this.invulnerable
    };
  }

  // Get minimal data for other players (within view distance)
  getVisibleData() {
    return {
      id: this.id,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      size: Math.round(this.size),
      color: this.color
    };
  }

  // Check if this player can see another entity
  canSee(entity, viewDistance = 1000) {
    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= viewDistance + this.size + (entity.size || 0);
  }

  // Validate position to prevent cheating
  isValidPosition(worldWidth, worldHeight) {
    return this.x >= 0 && this.x <= worldWidth &&
           this.y >= 0 && this.y <= worldHeight;
  }

  // Apply world boundaries
  constrainToWorld(worldWidth, worldHeight) {
    const radius = this.size / 2;
    
    if (this.x - radius < 0) {
      this.x = radius;
      this.vx = 0;
    } else if (this.x + radius > worldWidth) {
      this.x = worldWidth - radius;
      this.vx = 0;
    }
    
    if (this.y - radius < 0) {
      this.y = radius;
      this.vy = 0;
    } else if (this.y + radius > worldHeight) {
      this.y = worldHeight - radius;
      this.vy = 0;
    }
  }
}

module.exports = Player; 