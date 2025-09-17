@echo off
echo ================================
echo Starting Cursor.io Server
echo ================================
echo.
echo Server will be available at: http://localhost:3000
echo.
cd server
set PATH=%PATH%;C:\Program Files\nodejs\
npm start
pause
