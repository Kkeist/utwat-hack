@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion

if not exist node_modules (
  echo Installing dependencies, this only happens once...
  call npm install
)

rem This project has its own port so two projects never share one: on a shared
rem port the browser shows the other project's cached page. If the port is
rem taken, move forward to the next one; never take over a port in use.
set /a PORT=36880
set /a PORT_LIMIT=PORT+60

:pick_port
netstat -ano | findstr /c:":!PORT! " | findstr /i "LISTENING" >nul
if not errorlevel 1 (
  set /a PORT+=1
  if !PORT! GEQ !PORT_LIMIT! goto no_port
  goto pick_port
)

echo Starting Dishly dev server...
echo Once it says "Ready", open http://localhost:!PORT! in your browser.
echo Close this window to stop the server.
echo.

call npm run dev -- --port !PORT!

pause
exit /b 0

:no_port
echo Every port from 36880 to !PORT_LIMIT! is busy. Close something and try again.
pause
exit /b 1
