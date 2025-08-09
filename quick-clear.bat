@echo off
title IEEE Tournament - Quick Database Clear
color 0E

echo ==========================================
echo    IEEE Tournament - Quick Database Clear
echo ==========================================
echo.

echo WARNING: This will delete ALL tournament data!
echo.
echo Press any key to continue or close this window to cancel...
pause >nul

echo.
echo Attempting to clear database via server API...
echo.

curl -X DELETE "http://localhost:3000/api/admin/clear-all?key=IEEE2025ADMIN" -s -w "Response Code: %%{http_code}\n"

if %errorlevel%==0 (
    echo.
    echo ✓ Database clearing request sent successfully!
    echo ✓ Check the admin panel or server console for confirmation.
) else (
    echo.
    echo ✗ Failed to connect to server. Trying alternative method...
    echo.
    echo Alternative: Manual database file deletion
    echo.
    if exist "tournament_scores.db" (
        echo Found database file: tournament_scores.db
        set /p manual="Delete this file manually? (Y/N): "
        if /i "!manual!"=="Y" (
            del "tournament_scores.db" 2>nul
            if exist "tournament_scores.db" (
                echo ✗ Could not delete database file. Please close the server first.
            ) else (
                echo ✓ Database file deleted successfully!
                echo ✓ Restart the server to create a fresh database.
            )
        )
    ) else (
        echo No database file found.
    )
)

echo.
echo ==========================================
echo.
pause
