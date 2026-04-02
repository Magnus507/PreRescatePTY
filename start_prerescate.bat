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
    echo [INFO] node_modules not found. Running npm install...
    call npm install
)

echo [INFO] Updating Database schema...
call npx prisma generate
call npx prisma db push --accept-data-loss
call npx tsx prisma/seed-packages.ts

echo [INFO] Abrira el navegador automaticamente en 5 segundos...
echo [INFO] Iniciando Next.js en Modo Desarrollo (Webpack)...
echo [INFO] Presione Ctrl+C dos veces para detener el servidor.
echo.

start "" "http://localhost:3000"
npm run dev

pause
