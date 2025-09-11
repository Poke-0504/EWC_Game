@echo off
echo 🚀 Setting up High-Performance Cursor.io Server for 400+ Players
echo ==================================================================

:: Check if we're in the right directory
if not exist "cursor_io" (
    echo ❌ Please run this script from the Agario_clone directory
    echo    Current directory: %cd%
    echo    Expected: ...\Agario_clone\
    pause
    exit /b 1
)

cd cursor_io\server

echo 📦 Installing Node.js dependencies...
call npm install express socket.io @socket.io/redis-adapter ioredis helmet uuid cluster

echo.
echo 🔧 Checking Redis installation...

:: Check if Redis is available
redis-cli --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Redis found!
    
    :: Check if Redis is running
    redis-cli ping >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Redis is already running
    ) else (
        echo 🚀 Starting Redis server...
        start /b redis-server
        timeout /t 3 /nobreak >nul
        
        redis-cli ping >nul 2>&1
        if %errorlevel% equ 0 (
            echo ✅ Redis started successfully
        ) else (
            echo ❌ Failed to start Redis
            pause
            exit /b 1
        )
    )
) else (
    echo ❌ Redis not found. Please install Redis:
    echo.
    echo Windows ^(with Chocolatey^):
    echo   choco install redis-64
    echo.
    echo Or download from:
    echo   https://github.com/microsoftarchive/redis/releases
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo 🎮 Starting High-Performance Cluster Server...
echo.
echo Server configuration:
echo   • Multi-process clustering ^(using all CPU cores^)
echo   • Spatial grid optimization
echo   • Redis-based state sharing
echo   • WebSocket-only transport
echo   • Support for 400-800 concurrent players
echo.
echo 🌍 Server will be available at: http://localhost:3000
echo 📊 Monitor performance at: http://localhost:3000/stats
echo.
echo Press Ctrl+C to stop the server
echo =================================================

:: Start the cluster server
call npm run cluster

echo.
echo 🛑 Server stopped. Thanks for using Cursor.io!
pause 