// UI Manager - Handles all user interface interactions and updates
class UIManager {
  constructor(app) {
    this.app = app;
    
    // Screen elements
    this.screens = {
      loading: document.getElementById('loading-screen'),
      start: document.getElementById('start-screen'),
      game: document.getElementById('game-screen'),
      death: document.getElementById('death-screen'),
      connectionLost: document.getElementById('connection-lost')
    };
    
    // UI elements
    this.elements = {
      playerName: document.getElementById('player-name'),
      playButton: document.getElementById('play-button'),
      playerScore: document.getElementById('player-score'),
      playersOnline: document.getElementById('players-online'),
      fpsCounter: document.getElementById('fps-counter'),
      leaderboardList: document.getElementById('leaderboard-list'),
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      respawnButton: document.getElementById('respawn-button'),
      mainMenuButton: document.getElementById('main-menu-button'),
      reconnectButton: document.getElementById('reconnect-button')
    };
    
    // Chat settings
    this.maxChatMessages = 50;
    this.chatMessages = [];
    
    // Notification system
    this.notifications = [];
    this.notificationContainer = null;
    
    this.init();
    console.log('🖥️ UIManager initialized');
  }

  init() {
    this.setupEventHandlers();
    this.createNotificationContainer();
    this.validateElements();
    
    // Show initial loading screen
    this.showLoadingScreen();
  }

  validateElements() {
    // Check if all required elements exist
    for (const [name, element] of Object.entries(this.elements)) {
      if (!element) {
        console.warn(`UI element not found: ${name}`);
      }
    }
    
    for (const [name, screen] of Object.entries(this.screens)) {
      if (!screen) {
        console.warn(`Screen not found: ${name}`);
      }
    }
  }

  setupEventHandlers() {
    // Play button
    if (this.elements.playButton) {
      this.elements.playButton.addEventListener('click', () => {
        this.handlePlayButton();
      });
    }
    
    // Player name input
    if (this.elements.playerName) {
      this.elements.playerName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handlePlayButton();
        }
      });
      
      // Focus on page load
      setTimeout(() => {
        this.elements.playerName.focus();
      }, 500);
    }
    
    // Respawn button
    if (this.elements.respawnButton) {
      this.elements.respawnButton.addEventListener('click', () => {
        this.app.respawn();
      });
    }
    
    // Main menu button
    if (this.elements.mainMenuButton) {
      this.elements.mainMenuButton.addEventListener('click', () => {
        this.showStartScreen();
      });
    }
    
    // Reconnect button
    if (this.elements.reconnectButton) {
      this.elements.reconnectButton.addEventListener('click', () => {
        this.hideConnectionLost();
        this.showLoadingScreen();
        this.app.connectToServer();
      });
    }
    
    // Chat input
    if (this.elements.chatInput) {
      this.elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.submitChat();
        }
      });
    }
  }

  // Screen management
  showScreen(screenName) {
    // Hide all screens
    Object.values(this.screens).forEach(screen => {
      if (screen) {
        screen.classList.remove('active');
      }
    });
    
    // Show target screen
    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
    }
  }

  showLoadingScreen() {
    this.showScreen('loading');
  }

  hideLoadingScreen() {
    if (this.screens.loading) {
      this.screens.loading.classList.remove('active');
    }
  }

  showStartScreen() {
    this.showScreen('start');
    
    // Focus on name input
    if (this.elements.playerName) {
      setTimeout(() => {
        this.elements.playerName.focus();
      }, 100);
    }
  }

  showGameScreen() {
    this.showScreen('game');
    
    // Start the game timer
    this.app.game.startGame();
  }

  showDeathScreen(stats) {
    if (!this.screens.death) return;
    
    // Update death stats
    const finalScore = document.getElementById('final-score');
    const finalKills = document.getElementById('final-kills');
    const timeAlive = document.getElementById('time-alive');
    
    if (finalScore) finalScore.textContent = stats.score || 0;
    if (finalKills) finalKills.textContent = stats.kills || 0;
    if (timeAlive) timeAlive.textContent = `${stats.timeAlive || 0}s`;
    
    this.screens.death.classList.add('active');
  }

  hideDeathScreen() {
    if (this.screens.death) {
      this.screens.death.classList.remove('active');
    }
  }

  showConnectionLost() {
    this.showScreen('connectionLost');
  }

  hideConnectionLost() {
    if (this.screens.connectionLost) {
      this.screens.connectionLost.classList.remove('active');
    }
  }

  // Game UI updates
  updatePlayerScore(score) {
    if (this.elements.playerScore) {
      this.elements.playerScore.textContent = score.toLocaleString();
    }
  }

  updatePlayersOnline(count) {
    if (this.elements.playersOnline) {
      this.elements.playersOnline.textContent = count;
    }
  }

  updateFPS(fps) {
    if (this.elements.fpsCounter) {
      this.elements.fpsCounter.textContent = `FPS: ${fps}`;
    }
  }

  updateLeaderboard(leaderboard) {
    if (!this.elements.leaderboardList || !leaderboard) return;
    
    // Clear existing leaderboard
    this.elements.leaderboardList.innerHTML = '';
    
    // Add new leaderboard entries
    leaderboard.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = `${index + 1}.`;
      
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = entry.name || 'Anonymous';
      
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = entry.score.toLocaleString();
      
      item.appendChild(rank);
      item.appendChild(name);
      item.appendChild(score);
      
      this.elements.leaderboardList.appendChild(item);
    });
    
    // If no entries, show placeholder
    if (leaderboard.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'leaderboard-item';
      placeholder.innerHTML = '<span class="rank">1.</span><span class="name">-</span><span class="score">0</span>';
      this.elements.leaderboardList.appendChild(placeholder);
    }
  }

  // Chat system
  addChatMessage(type, message, playerName = null) {
    if (!this.elements.chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${type}`;
    
    if (type === 'player' && playerName) {
      const nameSpan = document.createElement('span');
      nameSpan.className = 'player-name';
      nameSpan.textContent = playerName + ': ';
      
      messageElement.appendChild(nameSpan);
      messageElement.appendChild(document.createTextNode(message));
    } else {
      messageElement.textContent = message;
    }
    
    // Add to message list
    this.chatMessages.push(messageElement);
    this.elements.chatMessages.appendChild(messageElement);
    
    // Remove old messages if too many
    if (this.chatMessages.length > this.maxChatMessages) {
      const oldMessage = this.chatMessages.shift();
      if (oldMessage.parentNode) {
        oldMessage.parentNode.removeChild(oldMessage);
      }
    }
    
    // Scroll to bottom
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  submitChat() {
    if (!this.elements.chatInput) return;
    
    const message = this.elements.chatInput.value.trim();
    if (message) {
      this.app.sendChat(message);
      this.elements.chatInput.value = '';
    }
  }

  clearChat() {
    if (this.elements.chatMessages) {
      this.elements.chatMessages.innerHTML = '';
      this.chatMessages = [];
    }
  }

  // Notification system
  createNotificationContainer() {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this.notificationContainer);
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 5px;
      margin-bottom: 10px;
      font-family: 'Orbitron', monospace;
      border-left: 4px solid ${this.getNotificationColor(type)};
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s ease;
      pointer-events: auto;
    `;
    
    this.notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  getNotificationColor(type) {
    switch (type) {
      case 'success': return '#4ecdc4';
      case 'error': return '#ff6b6b';
      case 'warning': return '#feca57';
      default: return '#45b7d1';
    }
  }

  showError(message) {
    this.showNotification(message, 'error', 5000);
    console.error('UI Error:', message);
  }

  showSuccess(message) {
    this.showNotification(message, 'success', 3000);
  }

  // Event handlers
  handlePlayButton() {
    if (!this.elements.playerName) return;
    
    const playerName = this.elements.playerName.value.trim();
    if (!playerName) {
      this.showError('Please enter your name');
      return;
    }
    
    if (playerName.length > 20) {
      this.showError('Name must be 20 characters or less');
      return;
    }
    
    // Validate name (alphanumeric and basic symbols only)
    if (!/^[a-zA-Z0-9\s\-_\.]{1,20}$/.test(playerName)) {
      this.showError('Name contains invalid characters');
      return;
    }
    
    this.app.joinGame(playerName);
  }

  // Utility methods
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Settings and preferences
  savePlayerName() {
    if (this.elements.playerName && this.elements.playerName.value.trim()) {
      localStorage.setItem('cursorIO_playerName', this.elements.playerName.value.trim());
    }
  }

  loadPlayerName() {
    const savedName = localStorage.getItem('cursorIO_playerName');
    if (savedName && this.elements.playerName) {
      this.elements.playerName.value = savedName;
    }
  }

  // Mobile-specific UI adjustments
  adjustForMobile() {
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      document.body.classList.add('mobile');
      
      // Hide mouse-only UI elements
      const mouseOnlyElements = document.querySelectorAll('.mouse-only');
      mouseOnlyElements.forEach(element => {
        element.style.display = 'none';
      });
      
      // Add touch-friendly classes
      document.body.classList.add('touch-device');
    }
  }

  // Animation helpers
  fadeIn(element, duration = 300) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = progress.toString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }

  fadeOut(element, duration = 300, callback = null) {
    if (!element) return;
    
    let start = performance.now();
    const startOpacity = parseFloat(element.style.opacity) || 1;
    
    function animate(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      
      element.style.opacity = (startOpacity * (1 - progress)).toString();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
        if (callback) callback();
      }
    }
    
    requestAnimationFrame(animate);
  }

  // Initialize saved preferences
  initializePreferences() {
    this.loadPlayerName();
    this.adjustForMobile();
  }

  // Cleanup
  destroy() {
    // Remove notification container
    if (this.notificationContainer && this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
    }
    
    // Save player name
    this.savePlayerName();
    
    console.log('🖥️ UIManager destroyed');
  }
}

// Initialize preferences when UI is ready
document.addEventListener('DOMContentLoaded', () => {
  // This will be called after the UIManager is created in app.js
  setTimeout(() => {
    if (window.app && window.app.ui) {
      window.app.ui.initializePreferences();
    }
  }, 100);
}); 