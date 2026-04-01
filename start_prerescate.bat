@echo off
setlocal
set PROJECT_DIR=c:\AI\PreRescatePTY
cd /d "%PROJECT_DIR%"

echo ========================================================
echo   PreRescate PTY - Emergency Identification Platform
echo   Status: Initializing Development Server...
echo ========================================================
echo.

if not exist "node_modules" (
    echo [ERROR] node_modules not found. Running npm install...
    call npm install
)

echo [INFO] Starting Next.js (Localhost:3000)...
echo [INFO] Press Ctrl+C twice to stop the server anytime.
echo.

start "" "http://localhost:3000"
npm run dev

pause
