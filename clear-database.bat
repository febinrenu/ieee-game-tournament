@echo off
echo ==========================================
echo     IEEE Tournament - Database Cleaner
echo ==========================================
echo.

:menu
echo Choose an option:
echo 1. Clear ALL tournament data (DANGER!)
echo 2. View current statistics
echo 3. Create database backup
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto clear_all
if "%choice%"=="2" goto view_stats
if "%choice%"=="3" goto backup
if "%choice%"=="4" goto exit
echo Invalid choice. Please try again.
echo.
goto menu

:clear_all
echo.
echo ==========================================
echo                WARNING!
echo ==========================================
echo This will permanently delete ALL tournament data!
echo - All student scores
echo - All registration records
echo - All tournament statistics
echo.
echo This action CANNOT be undone!
echo.
echo Type exactly: YES DELETE ALL
set /p confirm="Confirmation: "

if not "%confirm%"=="YES DELETE ALL" (
    echo.
    echo Operation cancelled. You must type exactly: YES DELETE ALL
    echo.
    goto menu
)

echo.
echo Clearing database...
curl -X DELETE "http://localhost:3000/api/admin/clear-all?key=IEEE2025ADMIN" 2>nul
if %errorlevel%==0 (
    echo ✓ Database cleared successfully!
) else (
    echo ✗ Error: Could not connect to server. Make sure the server is running.
)
echo.
pause
goto menu

:view_stats
echo.
echo Current Tournament Statistics:
echo ==========================================
curl -s "http://localhost:3000/api/stats" 2>nul
if %errorlevel% neq 0 (
    echo ✗ Error: Could not connect to server. Make sure the server is running.
)
echo.
echo ==========================================
echo.
pause
goto menu

:backup
echo.
echo Creating database backup...
set timestamp=%date:~-4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set timestamp=%timestamp: =0%
set filename=tournament_backup_%timestamp%.json
curl -s "http://localhost:3000/api/admin/backup?key=IEEE2025ADMIN" -o "%filename%" 2>nul
if %errorlevel%==0 (
    echo ✓ Backup created: %filename%
) else (
    echo ✗ Error: Could not create backup. Make sure the server is running.
)
echo.
pause
goto menu

:exit
echo.
echo Thank you for using IEEE Tournament Database Cleaner!
echo.
pause
exit
