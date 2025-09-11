// Game Renderer - Handles all canvas rendering and graphics
class GameRenderer {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Rendering settings
    this.smoothing = true;
    this.showNames = true;
    this.showGrid = true;
    this.particleEffects = true;
    
    // Grid settings
    this.gridSize = 50;
    this.gridAlpha = 0.1;
    
    // Particle system
    this.particles = [];
    
    // Cache for gradients and patterns
    this.gradientCache = new Map();
    
    // Performance tracking
    this.renderTime = 0;
    
    this.initCanvas();
    this.setupCanvasSettings();
    
    console.log('🎨 GameRenderer initialized');
  }

  initCanvas() {
    this.handleResize();
    
    // Set canvas attributes for better performance
    this.canvas.setAttribute('width', this.canvas.width);
    this.canvas.setAttribute('height', this.canvas.height);
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    // Set actual size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // Scale context to ensure correct drawing operations
    this.ctx.scale(dpr, dpr);
    
    // Set display size
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    this.setupCanvasSettings();
  }

  setupCanvasSettings() {
    if (this.smoothing) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  render(deltaTime) {
    const startTime = performance.now();
    
    // Clear canvas
    this.clear();
    
    // Only render if we're in the game
    if (!this.app.isPlaying()) {
      this.renderTime = performance.now() - startTime;
      return;
    }
    
    const gameState = this.app.getGameState();
    const camera = gameState.camera;
    
    // Save context state
    this.ctx.save();
    
    // Apply camera transform
    this.ctx.scale(camera.zoom, camera.zoom);
    this.ctx.translate(-camera.x, -camera.y);
    
    // Render world background
    this.renderBackground();
    
    // Render grid
    if (this.showGrid) {
      this.renderGrid(camera);
    }
    
    // Get visible entities
    const visibleEntities = this.app.game.getVisibleEntities();
    
    // Render food
    this.renderFood(visibleEntities.food);
    
    // Render players (sorted by size, smallest first)
    const sortedPlayers = visibleEntities.players.sort((a, b) => a.renderSize - b.renderSize);
    this.renderPlayers(sortedPlayers);
    
    // Render particles
    this.renderParticles(deltaTime);
    
    // Restore context state
    this.ctx.restore();
    
    // Render UI elements (unaffected by camera)
    this.renderUI();
    
    this.renderTime = performance.now() - startTime;
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  renderBackground() {
    const gameState = this.app.getGameState();
    const world = gameState.world;
    
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, world.width, world.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#1a1a2e');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, world.width, world.height);
    
    // World border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, world.width, world.height);
  }

  renderGrid(camera) {
    const gameState = this.app.getGameState();
    const world = gameState.world;
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Calculate visible grid area
    const startX = Math.floor(camera.x / this.gridSize) * this.gridSize;
    const startY = Math.floor(camera.y / this.gridSize) * this.gridSize;
    const endX = camera.x + (canvasRect.width / camera.zoom);
    const endY = camera.y + (canvasRect.height / camera.zoom);
    
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.gridAlpha})`;
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    
    // Vertical lines
    for (let x = startX; x <= endX + this.gridSize; x += this.gridSize) {
      if (x >= 0 && x <= world.width) {
        this.ctx.moveTo(x, Math.max(0, camera.y));
        this.ctx.lineTo(x, Math.min(world.height, endY));
      }
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY + this.gridSize; y += this.gridSize) {
      if (y >= 0 && y <= world.height) {
        this.ctx.moveTo(Math.max(0, camera.x), y);
        this.ctx.lineTo(Math.min(world.width, endX), y);
      }
    }
    
    this.ctx.stroke();
  }

  renderFood(foodItems) {
    for (const food of foodItems) {
      this.renderFoodItem(food);
    }
  }

  renderFoodItem(food) {
    const x = food.x;
    const y = food.y;
    const radius = food.size / 2;
    
    // Create gradient for food
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, food.color);
    gradient.addColorStop(1, this.darkenColor(food.color, 0.3));
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add shine effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderPlayers(players) {
    for (const player of players) {
      this.renderPlayer(player);
    }
  }

  renderPlayer(player) {
    const x = player.renderX || player.x;
    const y = player.renderY || player.y;
    const radius = (player.renderSize || player.size) / 2;
    const isMyPlayer = this.app.game.myPlayer && player.id === this.app.game.myPlayer.id;
    
    // Invulnerability effect
    if (player.invulnerable) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.7;
    }
    
    // Player shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player body gradient
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, player.color);
    gradient.addColorStop(0.8, this.darkenColor(player.color, 0.2));
    gradient.addColorStop(1, this.darkenColor(player.color, 0.4));
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player outline
    this.ctx.strokeStyle = isMyPlayer ? '#fff' : this.darkenColor(player.color, 0.5);
    this.ctx.lineWidth = isMyPlayer ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Shine effect
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player name
    if (this.showNames && player.name) {
      this.renderPlayerName(player, x, y, radius);
    }
    
    if (player.invulnerable) {
      this.ctx.restore();
    }
  }

  renderPlayerName(player, x, y, radius) {
    const fontSize = Math.max(12, radius * 0.3);
    const isMyPlayer = this.app.game.myPlayer && player.id === this.app.game.myPlayer.id;
    
    this.ctx.save();
    
    // Scale text based on camera zoom for readability
    const gameState = this.app.getGameState();
    const textScale = Math.max(0.8, Math.min(1.5, 1 / gameState.camera.zoom));
    this.ctx.scale(textScale, textScale);
    
    // Adjust position for scaling
    const scaledX = x / textScale;
    const scaledY = (y + radius + 20) / textScale;
    
    this.ctx.font = `${fontSize}px Orbitron, monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Text background
    const textWidth = this.ctx.measureText(player.name).width;
    const padding = 8;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(
      scaledX - textWidth/2 - padding,
      scaledY - fontSize/2 - 4,
      textWidth + padding * 2,
      fontSize + 8
    );
    
    // Text
    this.ctx.fillStyle = isMyPlayer ? '#fff' : '#eee';
    this.ctx.fillText(player.name, scaledX, scaledY);
    
    this.ctx.restore();
  }

  renderParticles(deltaTime) {
    // Update and render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update particle
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Render particle
      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  renderUI() {
    // Render crosshair at mouse position
    const mousePos = this.app.input ? this.app.input.getMousePosition() : null;
    if (mousePos && this.app.isPlaying()) {
      this.renderCrosshair(mousePos.x, mousePos.y);
    }
    
    // Render debug info if enabled
    if (this.app.getGameState().debug) {
      this.renderDebugInfo();
    }
  }

  renderCrosshair(x, y) {
    const size = 10;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - size, y);
    this.ctx.lineTo(x + size, y);
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x, y + size);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  renderDebugInfo() {
    const debugInfo = this.app.game.getDebugInfo();
    const stats = this.app.getStats();
    
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 200, 120);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    const lines = [
      `FPS: ${stats.fps}`,
      `Render Time: ${this.renderTime.toFixed(2)}ms`,
      `Players: ${debugInfo.players}`,
      `Food: ${debugInfo.food}`,
      `Particles: ${this.particles.length}`,
      `Interpolating: ${debugInfo.interpolationData}`
    ];
    
    lines.forEach((line, index) => {
      this.ctx.fillText(line, 20, 30 + index * 15);
    });
    
    this.ctx.restore();
  }

  // Particle effects
  createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 100;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: color || '#ff6b6b',
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        alpha: 1
      });
    }
  }

  // Utility functions
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgb(${Math.floor(r * (1 - factor))}, ${Math.floor(g * (1 - factor))}, ${Math.floor(b * (1 - factor))})`;
  }

  screenToWorld(screenX, screenY) {
    const gameState = this.app.getGameState();
    const camera = gameState.camera;
    
    return {
      x: (screenX / camera.zoom) + camera.x,
      y: (screenY / camera.zoom) + camera.y
    };
  }

  worldToScreen(worldX, worldY) {
    const gameState = this.app.getGameState();
    const camera = gameState.camera;
    
    return {
      x: (worldX - camera.x) * camera.zoom,
      y: (worldY - camera.y) * camera.zoom
    };
  }

  // Settings
  setShowGrid(show) {
    this.showGrid = show;
  }

  setShowNames(show) {
    this.showNames = show;
  }

  setSmoothing(enabled) {
    this.smoothing = enabled;
    this.setupCanvasSettings();
  }

  getCanvas() {
    return this.canvas;
  }

  getContext() {
    return this.ctx;
  }
} 