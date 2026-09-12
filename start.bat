@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies, this only happens once...
  call npm install
)

echo Starting Dishly dev server...
echo Once it says "Ready", open http://localhost:3000 in your browser.
echo Close this window to stop the server.
echo.

set MOCK_STEEL=1
call npm run dev

pause
