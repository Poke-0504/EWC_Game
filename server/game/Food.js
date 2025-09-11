const { v4: uuidv4 } = require('uuid');

class Food {
  constructor(x, y, size = 6, nutritionValue = 1) {
    this.id = uuidv4();
    this.x = x;
    this.y = y;
    this.size = size;
    this.nutritionValue = nutritionValue;
    this.color = this.getRandomColor();
    this.eaten = false;
    this.spawnTime = Date.now();
  }

  getRandomColor() {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff9f43', '#10ac84', '#ee5a6f',
      '#0984e3', '#6c5ce7', '#fdcb6e', '#e17055'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Check collision with a player
  collidesWith(player) {
    if (this.eaten || !player.alive) return false;

    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Player can eat food if they're close enough
    return distance < (player.size / 2 + this.size / 2);
  }

  // Mark as eaten
  eat() {
    this.eaten = true;
  }

  // Get data for client
  getClientData() {
    return {
      id: this.id,
      x: Math.round(this.x),
      y: Math.round(this.y),
      size: this.size,
      color: this.color
    };
  }

  // Static method to create random food
  static createRandom(worldWidth, worldHeight, size = 6) {
    const x = Math.random() * worldWidth;
    const y = Math.random() * worldHeight;
    return new Food(x, y, size);
  }

  // Static method to create food at specific location
  static createAt(x, y, size = 6, nutritionValue = 1) {
    return new Food(x, y, size, nutritionValue);
  }

  // Check if food is within view distance of a player
  isVisibleTo(player, viewDistance = 1000) {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= viewDistance + player.size + this.size;
  }
}

module.exports = Food; 