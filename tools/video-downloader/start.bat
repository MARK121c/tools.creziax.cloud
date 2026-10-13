@echo off
chcp 65001 > nul
title أداة تنزيل الفيديوهات ومقاطع يوتيوب
color 0b
echo ======================================================
echo    🎬 جاري تشغيل أداة تنزيل الفيديوهات بجودة فائقة...
echo ======================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [*] جاري تثبيت الحزم المطلوبة لأول مرة...
    call npm install
)

set PORT=3500
echo [*] Server running at http://localhost:3500
start http://localhost:3500
node server.js
pause
