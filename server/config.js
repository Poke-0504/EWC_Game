module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  
  world: {
    width: 5000,
    height: 5000,
    backgroundColor: '#1a1a2e'
  },
  
  player: {
    startSize: 20,
    maxSize: 200,
    minSize: 10,
    splitCooldown: 3000, // 3 seconds
    maxSplits: 4,
    mergeTime: 15000, // 15 seconds until pieces can merge
    maxSpeed: 5,
    colors: [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff9f43', '#54a0ff', '#5f27cd'
    ]
  },
  
  food: {
    count: 1000,
    size: 6,
    colors: [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff9f43', '#10ac84', '#ee5a6f',
      '#0984e3', '#6c5ce7', '#fdcb6e', '#e17055'
    ],
    respawnTime: 100, // milliseconds
    nutritionValue: 1
  },
  
  virus: {
    enabled: true,
    count: 50,
    size: 35,
    splitSize: 120, // Players larger than this get split by virus
    color: '#33aa33',
    strokeColor: '#228822',
    strokeWidth: 3
  },
  
  gameplay: {
    eatRatio: 1.2, // Player must be 20% larger to eat another player
    massLoss: {
      enabled: true,
      rate: 0.002, // Mass lost per second (percentage)
      minSize: 15 // Don't lose mass below this size
    },
    viewDistance: 1000, // How far players can see
    maxNameLength: 20,
    maxChatLength: 100,
    invulnerabilityTime: 3000 // New player invulnerability in ms
  },
  
  leaderboard: {
    maxEntries: 10,
    updateInterval: 2000 // milliseconds
  },
  
  security: {
    maxPlayersPerIP: 3,
    antiSpamDelay: 1000, // milliseconds between actions
    maxMovementSpeed: 10, // Maximum movement vector length
    validatePositions: true,
    encryptTraffic: process.env.NODE_ENV === 'production'
  },
  
  debug: {
    enabled: process.env.NODE_ENV !== 'production',
    showCollisionBoxes: false,
    logPlayerActions: false,
    showFPS: true
  }
}; 