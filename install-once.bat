@echo off
chcp 65001 >nul
title First-time setup - Network Cards System
cd /d "%~dp0"

echo.
echo  ========================================
echo   First-time setup (run once only)
echo   Pocket Wallet - Network Cards
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  Node.js is NOT installed.
    echo.
    echo  Step 1: Download and install Node.js LTS from:
    echo  https://nodejs.org
    echo.
    echo  Step 2: Restart this setup after installing Node.js
    echo.
    start https://nodejs.org/en/download
    pause
    exit /b 1
)

echo  Node.js found:
node -v
echo.

if not exist "dist\index.html" (
    echo  ERROR: dist folder not found.
    echo  Ask admin to send the full application folder.
    pause
    exit /b 1
)

echo  Installing application dependencies...
call npm install --omit=dev
if errorlevel 1 (
    echo  Install failed. Check internet connection.
    pause
    exit /b 1
)

echo.
echo  Creating desktop shortcut...
cscript //nologo "%~dp0scripts\create-shortcut.vbs" "%~dp0"
if errorlevel 1 (
    echo  Shortcut creation failed.
    pause
    exit /b 1
)

echo.
echo  ========================================
echo   Setup complete!
echo.
echo   A shortcut was added to your Desktop:
echo   "Mahfazat Jeeb - Network Cards"
echo   or "محفظة جيب - كروت الشبكات"
echo.
echo   Daily use: double-click the desktop icon.
echo   Login: admin / 1234  (change password in Settings)
echo  ========================================
echo.
pause
