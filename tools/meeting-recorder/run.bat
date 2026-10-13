@echo off
title Stealth Meeting Recorder Pro
color 0b
echo ===================================================
echo     Stealth Meeting Recorder Pro - Windows
echo ===================================================
echo.

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not added to PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

:: Check if virtual environment exists
if not exist "venv" (
    echo [*] Creating virtual environment (venv)...
    python -m venv venv
    echo [*] Installing dependencies...
    call venv\Scripts\activate
    pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo [*] Starting Stealth Meeting Recorder Pro...
python main.py

if %errorlevel% neq 0 (
    echo.
    echo [!] Application exited with an error. Check logs above.
    pause
)
