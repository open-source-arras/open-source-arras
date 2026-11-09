@echo off
cd /d "%~dp0"
if not exist "node_modules" (
    call npm install
    if errorlevel 1 pause & exit /b 1
)
node --no-lazy index
pause
