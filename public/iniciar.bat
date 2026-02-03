@echo off
cd /d "%~dp0\.."
if exist ".next" rmdir /s /q ".next"
start "Servidor" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:3000
