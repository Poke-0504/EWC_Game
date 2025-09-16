# 🎮 Cursor.io Setup Instructions

## ❌ **Problem**: Cannot access localhost:3000

**Root Cause**: Node.js is not installed on your system.

## ✅ **Solution**: Install Node.js and Dependencies

### Step 1: Install Node.js
1. **Visit**: https://nodejs.org/
2. **Download**: The LTS (Long Term Support) version - recommended
3. **Install**: Run the downloaded installer
4. **Important**: Restart your PowerShell/Command Prompt after installation

### Step 2: Verify Installation
Open a new command prompt and run:
```bash
node --version
npm --version
```
Both commands should return version numbers.

### Step 3: Automated Setup
Double-click the `setup-nodejs.bat` file in the project root, or run it from command line:
```bash
setup-nodejs.bat
```

### Step 4: Manual Setup (if automated fails)
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

### Step 5: Access the Game
Open your browser and go to: **http://localhost:3000**

## 🎯 **What You'll Experience**

Once the server is running, you'll have access to all the enhanced features:

### 🥚 **Easter Eggs**
- Try usernames: `amba_fermi` or `amba_tihao` for VIP experience
- VIP players get golden effects and 1000 starting mass

### ⚡ **Enhanced Gameplay**
- **Unlimited Splitting**: Press SPACE to split as many times as you want
- **Growth Milestones**: Get bonus mass every 100 points
- **Visual Effects**: Rich glow effects and particle systems
- **Smart Merging**: Magnetic attraction between cells ready to merge

### 🌟 **Visual Indicators**
- 🔵 **Cyan glow** = Just split
- 🟢 **Green pulsing** = Ready to merge  
- 🔴 **Red border** = Can't merge yet
- 👑 **Golden aura** = VIP player

## 🔧 **Troubleshooting**

### Port 3000 already in use:
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Dependencies won't install:
```bash
npm cache clean --force
npm install
```

### Server won't start:
Check the console output for specific error messages.

---

## 🚀 **Quick Start After Node.js Installation**

1. Double-click `setup-nodejs.bat`
2. Wait for "Server started" message
3. Open browser to `http://localhost:3000`
4. Enter your name (try `amba_fermi` for Easter egg!)
5. Click PLAY and enjoy the enhanced multiplayer experience!

**Note**: The server needs to stay running while you play. Don't close the command prompt window that shows "Server started".
