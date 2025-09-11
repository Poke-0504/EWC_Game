// Main application entry point
class CursorIOApp {
  constructor() {
    this.socket = null;
    this.game = null;
    this.renderer = null;
    this.input = null;
    this.ui = null;
    
    this.gameState = {
      connected: false,
      playing: false,
      player: null,
      players: new Map(),
      food: new Map(),
      world: { width: 5000, height: 5000 },
      camera: { x: 0, y: 0, zoom: 1 }
    };
    
    this.stats = {
      fps: 0,
      ping: 0,
      playersOnline: 0
    };
    
    this.init();
  }

  init() {
    console.log('🎮 Initializing Cursor.io...');
    
    // Initialize components
    this.ui = new UIManager(this);
    this.renderer = new GameRenderer(this);
    this.input = new InputManager(this);
    this.game = new GameLogic(this);
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Initialize socket connection
    this.connectToServer();
    
    // Start the game loop
    this.startGameLoop();
    
    console.log('✅ Cursor.io initialized successfully');
  }

  setupEventHandlers() {
    // Window events
    window.addEventListener('resize', () => {
      this.renderer.handleResize();
    });
    
    window.addEventListener('beforeunload', () => {
      if (this.socket) {
        this.socket.disconnect();
      }
    });
    
    // Visibility change (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.game.pause();
      } else {
        this.game.resume();
      }
    });
  }

  connectToServer() {
    console.log('🔌 Connecting to server...');
    
    this.socket = io({
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket.id);
      this.gameState.connected = true;
      this.ui.hideLoadingScreen();
      this.ui.showStartScreen();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.gameState.connected = false;
      this.gameState.playing = false;
      this.ui.showConnectionLost();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      this.ui.showConnectionLost();
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected to server');
      this.gameState.connected = true;
      this.ui.hideConnectionLost();
    });

    // Game events
    this.socket.on('game-joined', (data) => {
      console.log('🎮 Joined game:', data);
      this.gameState.playing = true;
      this.gameState.player = { id: data.playerId };
      this.gameState.world = data.world;
      this.ui.showGameScreen();
    });

    this.socket.on('game-update', (data) => {
      this.game.handleGameUpdate(data);
    });

    this.socket.on('leaderboard-update', (data) => {
      this.ui.updateLeaderboard(data);
    });

    this.socket.on('player-joined', (data) => {
      console.log('👤 Player joined:', data.name);
      this.ui.addChatMessage('system', `${data.name} joined the game`);
    });

    this.socket.on('player-left', (data) => {
      console.log('👋 Player left:', data.name);
      this.ui.addChatMessage('system', `${data.name} left the game`);
      this.gameState.players.delete(data.id);
    });

    this.socket.on('chat-message', (data) => {
      this.ui.addChatMessage('player', data.message, data.playerName);
    });

    this.socket.on('error', (error) => {
      console.error('🔥 Server error:', error);
      this.ui.showError(error);
    });
  }

  // Game Actions
  joinGame(playerName) {
    if (!this.gameState.connected || !this.socket) {
      console.error('Not connected to server');
      return;
    }

    if (!playerName || playerName.trim().length === 0) {
      this.ui.showError('Please enter a valid name');
      return;
    }

    console.log('🚀 Joining game as:', playerName);
    this.socket.emit('join-game', { name: playerName.trim() });
  }

  sendMovement(x, y) {
    if (!this.gameState.playing || !this.socket) return;
    
    this.socket.emit('move', { x, y });
  }

  splitPlayer() {
    if (!this.gameState.playing || !this.socket) return;
    
    this.socket.emit('split');
  }

  sendChat(message) {
    if (!this.gameState.playing || !this.socket || !message.trim()) return;
    
    this.socket.emit('chat', { message: message.trim() });
  }

  respawn() {
    if (!this.gameState.connected || !this.socket) return;
    
    this.gameState.playing = false;
    this.gameState.player = null;
    this.gameState.players.clear();
    this.gameState.food.clear();
    
    this.ui.hideDeathScreen();
    this.ui.showStartScreen();
  }

  // Game Loop
  startGameLoop() {
    let lastTime = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;

    const gameLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update FPS counter
      frameCount++;
      if (currentTime - lastFpsUpdate >= 1000) {
        this.stats.fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = currentTime;
        this.ui.updateFPS(this.stats.fps);
      }

      // Update game logic
      if (this.gameState.playing) {
        this.game.update(deltaTime);
      }

      // Render
      this.renderer.render(deltaTime);

      // Continue loop
      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
    console.log('🎯 Game loop started');
  }

  // Utility methods
  getMyPlayer() {
    if (!this.gameState.player) return null;
    return this.gameState.players.get(this.gameState.player.id);
  }

  isPlaying() {
    return this.gameState.playing && this.gameState.connected;
  }

  getGameState() {
    return this.gameState;
  }

  getStats() {
    return this.stats;
  }

  // Error handling
  handleError(error) {
    console.error('🔥 Application error:', error);
    this.ui.showError(error.message || 'An error occurred');
  }
}

// Initialize the app when the page loads
let app;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new CursorIOApp();
    
    // Make app globally available for debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window.cursorIO = app;
      console.log('🐛 Debug mode: window.cursorIO available');
    }
  } catch (error) {
    console.error('Failed to initialize Cursor.io:', error);
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: monospace; color: #ff6b6b;">
        <div style="text-align: center;">
          <h1>Failed to Initialize Game</h1>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
});

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CursorIOApp;
} 