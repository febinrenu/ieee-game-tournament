@echo off
echo ==========================================
echo IEEE Tournament Server Setup
echo ==========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js is installed

REM Install dependencies
echo.
echo Installing server dependencies...
npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo ✓ Dependencies installed successfully!

REM Create database directory if it doesn't exist
if not exist "data" mkdir data

echo.
echo ==========================================
echo Setup completed successfully!
echo ==========================================
echo.
echo To start the tournament server:
echo   npm start
echo.
echo Server will be available at:
echo   Game: http://localhost:3000
echo   Leaderboard: http://localhost:3000/leaderboard
echo.
echo For 600+ concurrent users, consider:
echo   - Using a dedicated server
echo   - Setting up load balancing
echo   - Using a production database (PostgreSQL/MySQL)
echo.
pause
