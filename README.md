# 🎮 Cursor.io

A modern, secure real-time multiplayer game similar to Agar.io, built with Node.js, Socket.io, and HTML5 Canvas.

![Cursor.io Screenshot](https://via.placeholder.com/800x400/1a1a2e/ff6b6b?text=Cursor.io+-+Eat%2C+Grow%2C+Survive!)

## ✨ Features

- 🌐 **Real-time multiplayer** - Play with friends and strangers
- 🎨 **Modern UI** - Beautiful gradients and animations
- 🔒 **Secure** - Built with security best practices
- 📱 **Mobile friendly** - Touch controls and responsive design
- 💬 **Chat system** - Communicate with other players
- 🏆 **Leaderboard** - Compete for the top spot
- ⚡ **Smooth gameplay** - 60 FPS with interpolation
- 🎯 **Anti-cheat** - Server-side validation
- 🛡️ **Rate limiting** - Protection against spam and abuse

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd cursor_io
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```

That's it! 🎉

## 🎮 How to Play

### Basic Controls
- **Mouse** - Move your cell toward the cursor
- **SPACE** - Split your cell (requires sufficient mass)
- **T** - Open chat
- **ENTER** - Send chat message
- **ESC** - Close chat

### Game Rules
1. **Eat food** (small colored dots) to grow your cell
2. **Eat smaller players** to gain their mass
3. **Avoid larger players** - they can eat you!
4. **Split strategically** - Use SPACE to split and catch other players
5. **Survive as long as possible** and climb the leaderboard

### Tips
- Larger cells move slower
- You lose mass over time when very large
- New players have temporary invulnerability
- Use the grid to judge distances
- Chat with other players for strategy or fun!

## ⚙️ Configuration

Edit `server/config.js` to customize:

```javascript
module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  world: {
    width: 5000,
    height: 5000
  },
  player: {
    startSize: 20,
    maxSize: 200,
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', ...]
  },
  food: {
    count: 1000,
    size: 6
  }
  // ... more options
};
```

## 🛡️ Security Features

- **Input validation** and sanitization
- **Rate limiting** on connections and actions
- **XSS prevention** with HTML sanitization
- **SQL injection prevention** (not applicable, using in-memory storage)
- **CORS protection**
- **Security headers** with Helmet.js
- **Anti-spam measures**

## 🏗️ Architecture

```
cursor_io/
├── server/
│   ├── app.js              # Main server application
│   ├── config.js           # Game configuration
│   └── game/
│       ├── GameWorld.js    # Game world manager
│       ├── Player.js       # Player class
│       └── Food.js         # Food item class
├── public/
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Game styling
│   └── js/
│       ├── app.js          # Main client application
│       ├── game.js         # Client game logic
│       ├── renderer.js     # Canvas rendering
│       ├── input.js        # Input handling
│       └── ui.js           # UI management
└── package.json            # Project dependencies
```

## 🔧 Development

### Running in Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Available Scripts
- `npm start` - Start the production server
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests (when implemented)

### Debug Mode
Open browser console to see debug information. The game object is available as `window.cursorIO` in development.

## 🌐 Deployment

### Heroku
1. Create a Heroku app
2. Connect your repository
3. Deploy from the main branch
4. The app will automatically use the `PORT` environment variable

### Other Platforms
- Set the `PORT` environment variable for the server port
- Set `NODE_ENV=production` for production optimizations
- Ensure Node.js v14+ is available

### Environment Variables
```bash
PORT=3000                    # Server port
NODE_ENV=production          # Production mode
HOST=0.0.0.0                # Server host
```

## 📊 Performance

- **Server tick rate:** 60 FPS
- **Client broadcast rate:** 20 FPS (reduces network load)
- **Optimized rendering** with culling and interpolation
- **Memory efficient** with entity cleanup
- **Rate limited** to prevent abuse

## 🎨 Customization

### Adding New Colors
Edit the `colors` arrays in `server/config.js`:

```javascript
player: {
  colors: [
    '#your-color-here',
    // ... existing colors
  ]
}
```

### Modifying Game Mechanics
Key settings in `server/config.js`:
- `player.startSize` - Starting player size
- `food.count` - Amount of food in the world
- `gameplay.eatRatio` - How much bigger you need to be to eat another player
- `gameplay.massLoss.rate` - Mass loss rate for large players

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Connection issues:**
- Check if port 3000 is accessible
- Verify firewall settings
- Ensure Node.js is properly installed

**Performance issues:**
- Reduce `food.count` in config
- Lower `networkUpdateFactor` in config
- Check browser console for errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use modern JavaScript (ES6+)
- Follow existing code patterns
- Add comments for complex logic
- Test on multiple browsers

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original Agar.io
- Built with modern web technologies
- Designed for learning and fun

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Look at existing GitHub issues
3. Create a new issue with detailed information

---

**Made with ❤️ for the gaming community**

Enjoy playing Cursor.io! 🎮 