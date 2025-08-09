@echo off
echo ==========================================
echo IEEE Tournament Server
echo ==========================================
echo.
echo Starting server for 600+ concurrent students...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo Server starting...
echo.
echo ✓ Game available at: http://localhost:3000
echo ✓ Leaderboard at: http://localhost:3000/leaderboard
echo.
echo Press Ctrl+C to stop the server
echo ==========================================

npm start
