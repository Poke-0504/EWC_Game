// Input Manager - Handles mouse and keyboard input
class InputManager {
  constructor(app) {
    this.app = app;
    this.canvas = null;
    
    // Mouse state
    this.mouse = {
      x: 0,
      y: 0,
      isDown: false,
      lastClickTime: 0
    };
    
    // Keyboard state
    this.keys = new Map();
    this.keyCooldowns = new Map();
    
    // Touch state for mobile
    this.touch = {
      active: false,
      x: 0,
      y: 0,
      identifier: null
    };
    
    // Chat state
    this.chatActive = false;
    
    // Mobile detection
    this.isMobile = this.detectMobile();
    
    this.init();
    console.log('🎯 InputManager initialized');
  }

  init() {
    // Get canvas reference
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) {
      console.error('Game canvas not found');
      return;
    }
    
    this.setupMouseEvents();
    this.setupKeyboardEvents();
    this.setupTouchEvents();
    this.setupContextMenu();
  }

  setupMouseEvents() {
    // Mouse movement
    this.canvas.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
    });
    
    // Mouse click for actions
    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.mouse.isDown = true;
      
      const now = Date.now();
      const timeSinceLastClick = now - this.mouse.lastClickTime;
      
      // Double click detection
      if (timeSinceLastClick < 300) {
        this.handleDoubleClick(e);
      }
      
      this.mouse.lastClickTime = now;
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.mouse.isDown = false;
    });
    
    // Prevent context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    // Mouse enter/leave for focus
    this.canvas.addEventListener('mouseenter', () => {
      if (this.app.isPlaying()) {
        this.canvas.style.cursor = 'none';
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.canvas.style.cursor = 'default';
    });
  }

  setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    document.addEventListener('keyup', (e) => {
      this.handleKeyUp(e);
    });
  }

  setupTouchEvents() {
    if (!this.isMobile) return;
    
    // Touch start
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        this.touch.active = true;
        this.touch.identifier = touch.identifier;
        this.updateTouchPosition(touch);
      }
    });
    
    // Touch move
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = this.findTouch(e.touches, this.touch.identifier);
      if (touch) {
        this.updateTouchPosition(touch);
      }
    });
    
    // Touch end
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touch.active = false;
      this.touch.identifier = null;
    });
    
    // Touch cancel
    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.touch.active = false;
      this.touch.identifier = null;
    });
  }

  setupContextMenu() {
    // Disable context menu globally to prevent issues
    document.addEventListener('contextmenu', (e) => {
      if (this.app.isPlaying()) {
        e.preventDefault();
      }
    });
  }

  updateMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  updateTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    this.touch.x = touch.clientX - rect.left;
    this.touch.y = touch.clientY - rect.top;
    
    // Also update mouse position for compatibility
    this.mouse.x = this.touch.x;
    this.mouse.y = this.touch.y;
  }

  findTouch(touches, identifier) {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === identifier) {
        return touches[i];
      }
    }
    return null;
  }

  handleKeyDown(e) {
    const key = e.code || e.key;
    
    // Don't handle keys if chat is active
    if (this.chatActive && key !== 'Escape' && key !== 'Enter') {
      return;
    }
    
    // Prevent default for game keys
    const gameKeys = ['Space', 'KeyW', 'KeyT', 'Escape', 'Enter'];
    if (gameKeys.includes(key)) {
      e.preventDefault();
    }
    
    // Set key state
    this.keys.set(key, true);
    
    // Handle specific key actions
    this.handleKeyAction(key, true);
  }

  handleKeyUp(e) {
    const key = e.code || e.key;
    this.keys.set(key, false);
    
    // Clean up cooldowns when key is released
    this.keyCooldowns.delete(key);
  }

  handleKeyAction(key, isPressed) {
    if (!isPressed) return;
    
    // Check cooldown
    const now = Date.now();
    const lastAction = this.keyCooldowns.get(key) || 0;
    const cooldownTime = 200; // 200ms cooldown
    
    if (now - lastAction < cooldownTime) {
      return;
    }
    
    this.keyCooldowns.set(key, now);
    
    // Handle different keys
    switch (key) {
      case 'Space':
        if (this.app.isPlaying()) {
          this.app.splitPlayer();
          console.log('🔄 Player split requested');
        }
        break;
        
      case 'KeyW':
      case 'KeyE':
        // Alternative split key
        if (this.app.isPlaying()) {
          this.app.splitPlayer();
        }
        break;
        
      case 'KeyT':
        if (this.app.isPlaying()) {
          this.toggleChat();
        }
        break;
        
      case 'Enter':
        if (this.chatActive) {
          this.submitChat();
        }
        break;
        
      case 'Escape':
        if (this.chatActive) {
          this.closeChat();
        }
        break;
        
      case 'F11':
        this.toggleFullscreen();
        break;
    }
  }

  handleDoubleClick(e) {
    // Double click to split (alternative to spacebar)
    if (this.app.isPlaying()) {
      this.app.splitPlayer();
      console.log('🔄 Player split requested (double-click)');
    }
  }

  toggleChat() {
    const chatContainer = document.getElementById('chat-input-container');
    const chatInput = document.getElementById('chat-input');
    
    if (this.chatActive) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    const chatContainer = document.getElementById('chat-input-container');
    const chatInput = document.getElementById('chat-input');
    
    if (chatContainer && chatInput) {
      chatContainer.style.display = 'block';
      chatInput.focus();
      this.chatActive = true;
      
      console.log('💬 Chat opened');
    }
  }

  closeChat() {
    const chatContainer = document.getElementById('chat-input-container');
    const chatInput = document.getElementById('chat-input');
    
    if (chatContainer && chatInput) {
      chatContainer.style.display = 'none';
      chatInput.blur();
      chatInput.value = '';
      this.chatActive = false;
      
      // Focus back on canvas
      this.canvas.focus();
      
      console.log('💬 Chat closed');
    }
  }

  submitChat() {
    const chatInput = document.getElementById('chat-input');
    
    if (chatInput && chatInput.value.trim()) {
      const message = chatInput.value.trim();
      this.app.sendChat(message);
      
      console.log('💬 Chat message sent:', message);
    }
    
    this.closeChat();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Public methods for getting input state
  getMousePosition() {
    if (this.isMobile && this.touch.active) {
      return { x: this.touch.x, y: this.touch.y };
    }
    return { x: this.mouse.x, y: this.mouse.y };
  }

  isMouseDown() {
    return this.mouse.isDown || this.touch.active;
  }

  isKeyPressed(key) {
    return this.keys.get(key) || false;
  }

  getWorldMousePosition() {
    const screenPos = this.getMousePosition();
    if (!screenPos || !this.app.renderer) return null;
    
    return this.app.renderer.screenToWorld(screenPos.x, screenPos.y);
  }

  // Utility methods
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  isChatActive() {
    return this.chatActive;
  }

  // Touch-specific methods for mobile
  getTouchPosition() {
    return this.touch.active ? { x: this.touch.x, y: this.touch.y } : null;
  }

  isTouchActive() {
    return this.touch.active;
  }

  // Cleanup
  destroy() {
    // Remove all event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.updateMousePosition);
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
      
      if (this.isMobile) {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
      }
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('contextmenu', this.handleContextMenu);
    
    console.log('🎯 InputManager destroyed');
  }

  // Debug information
  getDebugInfo() {
    return {
      mouse: { ...this.mouse },
      touch: { ...this.touch },
      chatActive: this.chatActive,
      isMobile: this.isMobile,
      activeKeys: Array.from(this.keys.entries()).filter(([key, pressed]) => pressed).map(([key]) => key)
    };
  }
} 