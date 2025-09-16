const { v4: uuidv4 } = require('uuid');

class PlayerCell {
  constructor(id, x, y, mass, color, splitTime = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.size = Math.sqrt(mass);
    this.mass = mass;
    this.color = color;
    this.vx = 0;
    this.vy = 0;
    this.splitTime = splitTime;
    this.canMerge = splitTime === 0;
    this.lastMergeCheck = 0;
  }

  update(deltaTime) {
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Apply friction based on split status
    const currentTime = Date.now();
    const timeSinceSplit = currentTime - this.splitTime;
    const recentlySplit = timeSinceSplit < 2000; // First 2 seconds after split
    const friction = recentlySplit ? 0.95 : 0.92; // Less friction for recent splits
    
    this.vx *= friction;
    this.vy *= friction;
    
    // Update size based on mass
    this.size = Math.sqrt(this.mass);
    
    // Update merge availability (cells can merge after 10 seconds)
    if (currentTime - this.splitTime > 10000) {
      this.canMerge = true;
    }
  }

  constrainToWorld(worldWidth, worldHeight) {
    const radius = this.size / 2;
    this.x = Math.max(radius, Math.min(worldWidth - radius, this.x));
    this.y = Math.max(radius, Math.min(worldHeight - radius, this.y));
  }

  getClientData() {
    return {
      id: this.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
      size: Math.round(this.size),
      mass: Math.round(this.mass),
      splitTime: this.splitTime,
      canMerge: this.canMerge
    };
  }
}

class Player {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;
    this.cells = []; // Multiple cells for advanced split mechanics
    this.targetX = 0; // mouse target x
    this.targetY = 0; // mouse target y
    this.color = this.getRandomColor();
    this.lastSplit = 0;
    this.lastMove = 0;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.score = 0;
    this.kills = 0;
    this.alive = true;
    this.spawned = false;
    this.splitCooldown = 1000; // 1 second cooldown between splits
    
    // Easter egg detection
    this.isVIP = this.checkEasterEgg(name);
    if (this.isVIP) {
      this.color = '#FFD700'; // Golden color for VIP players
    }
    
    // Growth milestone tracking
    this.lastGrowthMilestone = 0;
    this.growthNotifications = [];
  }

  getRandomColor() {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff9f43', '#10ac84', '#ee5a6f'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  checkEasterEgg(name) {
    const easterEggNames = ['amba_fermi', 'amba_tihao'];
    return easterEggNames.includes(name.toLowerCase());
  }

  spawn(x, y) {
    const initialMass = this.isVIP ? 1000 : 400; // VIP players get massive initial advantage
    
    // Create initial cell
    const mainCell = new PlayerCell(uuidv4(), x, y, initialMass, this.color);
    this.cells = [mainCell];
    
    this.alive = true;
    this.spawned = true;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.score = Math.floor(initialMass / 4);
    
    if (this.isVIP) {
      this.lastGrowthMilestone = Math.floor(this.score / 100);
    }
  }

  updateMovement(targetX, targetY) {
    if (!this.alive || this.cells.length === 0) return;

    this.targetX = targetX;
    this.targetY = targetY;
    this.lastMove = Date.now();

    // Update movement for each cell
    this.cells.forEach(cell => {
      const dx = targetX - cell.x;
      const dy = targetY - cell.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        const speed = Math.max(1, 5 - (cell.size - 20) / 30);
        cell.vx += (dx / distance) * speed * 0.1;
        cell.vy += (dy / distance) * speed * 0.1;
      }
    });
  }

  getSpeed() {
    // Speed decreases as size increases
    const baseSpeed = 5;
    const sizeModifier = Math.max(0.3, 1 - (this.size - 20) / 200);
    return baseSpeed * sizeModifier;
  }

  update(deltaTime) {
    if (!this.alive || !this.spawned || this.cells.length === 0) return;

    // Update invulnerability
    if (this.invulnerable) {
      if (Date.now() - this.invulnerabilityStart > 3000) { // 3 seconds
        this.invulnerable = false;
      }
    }

    // Update each cell
    this.cells.forEach(cell => {
      cell.update(deltaTime);
      
      // Mass loss over time for large cells
      if (cell.mass > 500) {
        const lossRate = 0.002; // 0.2% per second
        cell.mass = Math.max(400, cell.mass * (1 - lossRate * deltaTime));
        cell.size = Math.sqrt(cell.mass);
      }
    });

    // Handle cell interactions (collision prevention and merging)
    this.handleCellInteractions();

    // Calculate total mass and update score
    const totalMass = this.getTotalMass();
    this.score = Math.floor(totalMass / 4);

    // Growth mechanism: every 100 points, get a bonus growth
    this.checkGrowthMilestones();
  }

  canEat(other) {
    if (!this.alive || !other.alive || this === other) return false;
    if (other.invulnerable) return false;

    // Check if any of this player's cells can eat any of the other player's cells
    for (const myCell of this.cells) {
      for (const otherCell of other.cells) {
        // Must be 20% larger to eat another cell
    const eatRatio = 1.2;
        if (myCell.mass > otherCell.mass * eatRatio) {
          const dx = myCell.x - otherCell.x;
          const dy = myCell.y - otherCell.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < (myCell.size + otherCell.size) / 2) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  eat(other) {
    if (!this.canEat(other)) return false;

    // Find which cells can eat which
    for (const myCell of this.cells) {
      for (const otherCell of other.cells) {
        const eatRatio = 1.2;
        if (myCell.mass > otherCell.mass * eatRatio) {
          const dx = myCell.x - otherCell.x;
          const dy = myCell.y - otherCell.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < (myCell.size + otherCell.size) / 2) {
            // Gain mass from eating (80% efficiency)
            myCell.mass += otherCell.mass * 0.8;
            myCell.size = Math.sqrt(myCell.mass);
    this.kills++;

    // Kill the other player
    other.die();
            return true;
          }
        }
      }
    }

    return false;
  }

  eatFood(food) {
    if (!this.alive || this.cells.length === 0) return false;

    // Find the closest cell to the food
    let closestCell = this.cells[0];
    let closestDistance = Math.sqrt(
      Math.pow(closestCell.x - food.x, 2) + Math.pow(closestCell.y - food.y, 2)
    );
    
    for (const cell of this.cells) {
      const distance = Math.sqrt(
        Math.pow(cell.x - food.x, 2) + Math.pow(cell.y - food.y, 2)
      );
      
      if (distance < closestDistance) {
        closestCell = cell;
        closestDistance = distance;
      }
    }
    
    // Check if the closest cell can eat the food
    if (closestDistance < (closestCell.size + food.size) / 2) {
      closestCell.mass += food.nutritionValue || 3;
      closestCell.size = Math.sqrt(closestCell.mass);
      return true;
    }

    return false;
  }

  split() {
    const currentTime = Date.now();
    
    // Check cooldown
    if (currentTime - this.lastSplit < this.splitCooldown) {
      return false;
    }
    
    // No cell limit - split as many times as you want!
    const cellsToSplit = this.cells.filter(cell => cell.mass > 64);
    if (cellsToSplit.length === 0) return false;
    
    const newCells = [];
    
    cellsToSplit.forEach(cell => {
      const newMass = cell.mass / 2;
      const newSize = Math.sqrt(newMass);
      const angle = Math.atan2(this.targetY - cell.y, this.targetX - cell.x);
      
      // Calculate separation distance to prevent overlap
      const separationDistance = newSize * 2.0; // 2x radius for better separation
      
      // Create new cell - position it forward along the mouse direction
      const newCell = new PlayerCell(
        uuidv4(),
        cell.x + Math.cos(angle) * separationDistance,
        cell.y + Math.sin(angle) * separationDistance,
        newMass,
        this.color,
        currentTime
      );
      newCell.vx = Math.cos(angle) * 20; // Stronger sprint velocity
      newCell.vy = Math.sin(angle) * 20;
      
      // Update original cell - position it backward and update properties
      cell.x = cell.x - Math.cos(angle) * separationDistance;
      cell.y = cell.y - Math.sin(angle) * separationDistance;
      cell.mass = newMass;
      cell.size = newSize;
      cell.vx = -Math.cos(angle) * 15; // Opposite direction with stronger push
      cell.vy = -Math.sin(angle) * 15;
      cell.splitTime = currentTime;
      cell.canMerge = false;
      
      newCells.push(newCell);
    });
    
    // Add new cells to player
    this.cells.push(...newCells);
    this.lastSplit = currentTime;

    return true;
  }

  handleCellInteractions() {
    if (this.cells.length <= 1) return;
    
    const currentTime = Date.now();
    
    for (let i = this.cells.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const cell1 = this.cells[i];
        const cell2 = this.cells[j];
        
        const dx = cell1.x - cell2.x;
        const dy = cell1.y - cell2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (cell1.size + cell2.size) / 2; // Minimum distance = combined radius
        const easyMergeDistance = minDistance + 20; // Much easier merge when both can merge
        const hardMergeDistance = minDistance - 5; // Closer merge when one can't merge yet
        
        // Enhanced merge mechanism
        if (cell1.canMerge && cell2.canMerge) {
          // Magnetic attraction when both cells can merge
          if (distance < easyMergeDistance * 1.5) {
            const attractionForce = Math.max(0.5, (easyMergeDistance * 1.5 - distance) / 20);
            const attractX = (dx / distance) * attractionForce;
            const attractY = (dy / distance) * attractionForce;
            
            // Apply magnetic attraction (both cells move toward each other)
            cell1.vx -= attractX * 0.3;
            cell1.vy -= attractY * 0.3;
            cell2.vx += attractX * 0.3;
            cell2.vy += attractY * 0.3;
          }
          
          // Easy merge when both can merge
          if (distance < easyMergeDistance) {
            // Merge cells - much easier merge distance
            cell2.mass += cell1.mass;
            cell2.size = Math.sqrt(cell2.mass);
            cell2.x = (cell1.x * cell1.mass + cell2.x * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.y = (cell1.y * cell1.mass + cell2.y * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.vx = (cell1.vx * cell1.mass + cell2.vx * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.vy = (cell1.vy * cell1.mass + cell2.vy * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.splitTime = 0; // Reset split time
            cell2.canMerge = true;
            this.cells.splice(i, 1);
            break;
          }
        } else if (distance < hardMergeDistance) {
          // Harder merge when at least one cell can't merge yet
          if ((cell1.canMerge || cell2.canMerge)) {
            // Only merge if they're very close and at least one can merge
            cell2.mass += cell1.mass;
            cell2.size = Math.sqrt(cell2.mass);
            cell2.x = (cell1.x * cell1.mass + cell2.x * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.y = (cell1.y * cell1.mass + cell2.y * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.vx = (cell1.vx * cell1.mass + cell2.vx * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.vy = (cell1.vy * cell1.mass + cell2.vy * cell2.mass) / (cell1.mass + cell2.mass);
            cell2.splitTime = Math.min(cell1.splitTime, cell2.splitTime); // Keep earlier split time
            cell2.canMerge = cell1.canMerge && cell2.canMerge;
            this.cells.splice(i, 1);
            break;
          }
        }
        
        // Anti-overlap collision system (only when not merging)
        if (distance < minDistance) {
          // Handle edge case where cells are exactly on top of each other
          if (distance < 0.1) {
            // Add small random offset to separate overlapping cells
            const randomAngle = Math.random() * Math.PI * 2;
            cell1.x += Math.cos(randomAngle) * 2;
            cell1.y += Math.sin(randomAngle) * 2;
            cell2.x -= Math.cos(randomAngle) * 2;
            cell2.y -= Math.sin(randomAngle) * 2;
            continue; // Skip to next iteration to recalculate distance
          }
          
          // Push cells apart to prevent overlap (only if they're not ready to merge)
          const pushForce = (minDistance - distance) / 2;
          const pushX = (dx / distance) * pushForce;
          const pushY = (dy / distance) * pushForce;
          
          // Apply push forces (heavier cells move less)
          const totalMass = cell1.mass + cell2.mass;
          const cell1Ratio = cell2.mass / totalMass; // Cell1 moves based on cell2's mass
          const cell2Ratio = cell1.mass / totalMass; // Cell2 moves based on cell1's mass
          
          cell1.x += pushX * cell1Ratio;
          cell1.y += pushY * cell1Ratio;
          cell2.x -= pushX * cell2Ratio;
          cell2.y -= pushY * cell2Ratio;
          
          // Add some velocity to make the separation more natural
          const velocityDamping = 0.1;
          cell1.vx += pushX * velocityDamping * cell1Ratio;
          cell1.vy += pushY * velocityDamping * cell1Ratio;
          cell2.vx -= pushX * velocityDamping * cell2Ratio;
          cell2.vy -= pushY * velocityDamping * cell2Ratio;
        }
      }
    }
  }

  checkGrowthMilestones() {
    const currentMilestone = Math.floor(this.score / 100);
    if (currentMilestone > this.lastGrowthMilestone) {
      const bonusGrowths = currentMilestone - this.lastGrowthMilestone;
      const bonusMass = bonusGrowths * 50;
      
      // Add bonus mass to largest cell
      const largestCell = this.cells.reduce((largest, cell) => 
        cell.mass > largest.mass ? cell : largest
      );
      largestCell.mass += bonusMass;
      largestCell.size = Math.sqrt(largestCell.mass);
      this.lastGrowthMilestone = currentMilestone;
      
      // Add growth notification
      this.growthNotifications.push({
        milestone: currentMilestone * 100,
        bonusMass: bonusMass,
        timestamp: Date.now()
      });
    }
  }

  getTotalMass() {
    return this.cells.reduce((total, cell) => total + cell.mass, 0);
  }

  // Get center position of all cells
  getCenterPosition() {
    if (this.cells.length === 0) return { x: 0, y: 0 };
    
    let centerX = 0, centerY = 0, totalMass = 0;
    
    this.cells.forEach(cell => {
      centerX += cell.x * cell.mass;
      centerY += cell.y * cell.mass;
      totalMass += cell.mass;
    });
    
    return {
      x: centerX / totalMass,
      y: centerY / totalMass
    };
  }

  // Get largest cell
  getLargestCell() {
    if (this.cells.length === 0) return null;
    return this.cells.reduce((largest, cell) => 
      cell.mass > largest.mass ? cell : largest
    );
  }

  die() {
    this.alive = false;
    this.spawned = false;
    this.cells = [];
  }

  respawn() {
    this.alive = true;
    this.spawned = false;
    this.invulnerable = true;
    this.invulnerabilityStart = Date.now();
    this.cells = [];
    this.score = 0;
    this.lastGrowthMilestone = 0;
    this.growthNotifications = [];
  }

  // Check collision with another player (any cell with any cell)
  collidesWith(other) {
    if (!this.alive || !other.alive) return false;

    for (const myCell of this.cells) {
      for (const otherCell of other.cells) {
        const dx = myCell.x - otherCell.x;
        const dy = myCell.y - otherCell.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (myCell.size + otherCell.size) / 2) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Get player data for client
  getClientData() {
    const center = this.getCenterPosition();
    const largestCell = this.getLargestCell();
    
    return {
      id: this.id,
      name: this.name,
      x: Math.round(center.x),
      y: Math.round(center.y),
      size: largestCell ? Math.round(largestCell.size) : 0,
      color: this.color,
      score: this.score,
      alive: this.alive,
      invulnerable: this.invulnerable,
      isVIP: this.isVIP,
      cells: this.cells.map(cell => cell.getClientData()),
      growthNotifications: this.growthNotifications.splice(0), // Return and clear notifications
      totalMass: Math.round(this.getTotalMass())
    };
  }

  // Get minimal data for other players (within view distance)
  getVisibleData() {
    const center = this.getCenterPosition();
    const largestCell = this.getLargestCell();
    
    return {
      id: this.id,
      name: this.name,
      x: Math.round(center.x),
      y: Math.round(center.y),
      size: largestCell ? Math.round(largestCell.size) : 0,
      color: this.color,
      isVIP: this.isVIP,
      cells: this.cells.map(cell => ({
        id: cell.id,
        x: Math.round(cell.x),
        y: Math.round(cell.y),
        size: Math.round(cell.size),
        splitTime: cell.splitTime,
        canMerge: cell.canMerge
      }))
    };
  }

  // Check if this player can see another entity
  canSee(entity, viewDistance = 1000) {
    const center = this.getCenterPosition();
    const largestCell = this.getLargestCell();
    const playerSize = largestCell ? largestCell.size : 0;
    
    const dx = center.x - entity.x;
    const dy = center.y - entity.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= viewDistance + playerSize + (entity.size || 0);
  }

  // Validate position to prevent cheating
  isValidPosition(worldWidth, worldHeight) {
    return this.cells.every(cell => 
      cell.x >= 0 && cell.x <= worldWidth &&
      cell.y >= 0 && cell.y <= worldHeight
    );
  }

  // Apply world boundaries to all cells
  constrainToWorld(worldWidth, worldHeight) {
    this.cells.forEach(cell => {
      cell.constrainToWorld(worldWidth, worldHeight);
    });
  }
}

module.exports = Player; 