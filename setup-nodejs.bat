@echo off
echo ================================
echo Cursor.io Setup Script
echo ================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please follow these steps:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version ^(recommended^)
    echo 3. Run the installer
    echo 4. Restart this command prompt
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed: 
node --version

echo.
echo Installing server dependencies...
cd server
if not exist package.json (
    echo [ERROR] package.json not found in server directory!
    pause
    exit /b 1
)

npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Dependencies installed!
echo.
echo Starting the server...
start "Cursor.io Server" cmd /k "npm start"

echo.
echo Server should be starting...
echo Open your browser and go to: http://localhost:3000
echo.
pause
