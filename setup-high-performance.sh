#!/bin/bash

echo "🚀 Setting up High-Performance Cursor.io Server for 400+ Players"
echo "=================================================================="

# Check if we're in the right directory
if [ ! -d "cursor_io" ]; then
    echo "❌ Please run this script from the Agario_clone directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: .../Agario_clone/"
    exit 1
fi

cd cursor_io/server

echo "📦 Installing Node.js dependencies..."
npm install express socket.io @socket.io/redis-adapter ioredis helmet uuid cluster

echo ""
echo "🔧 Checking Redis installation..."

# Check if Redis is available
if command -v redis-server &> /dev/null; then
    echo "✅ Redis found!"
    
    # Check if Redis is running
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is already running"
    else
        echo "🚀 Starting Redis server..."
        redis-server --daemonize yes
        sleep 2
        
        if redis-cli ping &> /dev/null; then
            echo "✅ Redis started successfully"
        else
            echo "❌ Failed to start Redis"
            exit 1
        fi
    fi
else
    echo "❌ Redis not found. Please install Redis:"
    echo ""
    echo "Windows (with Chocolatey):"
    echo "  choco install redis-64"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt install redis-server"
    echo ""
    echo "macOS:"
    echo "  brew install redis"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo ""
echo "🎮 Starting High-Performance Cluster Server..."
echo ""
echo "Server configuration:"
echo "  • Multi-process clustering (using all CPU cores)"
echo "  • Spatial grid optimization"
echo "  • Redis-based state sharing"
echo "  • WebSocket-only transport"
echo "  • Support for 400-800 concurrent players"
echo ""
echo "🌍 Server will be available at: http://localhost:3000"
echo "📊 Monitor performance at: http://localhost:3000/stats"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================="

# Start the cluster server
npm run cluster

echo ""
echo "🛑 Server stopped. Thanks for using Cursor.io!" 