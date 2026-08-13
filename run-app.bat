@echo off
chcp 65001 >nul
title محفظة جيب - كروت الشبكات
cd /d "%~dp0"

set "NODE_DIR="
if exist "%LOCALAPPDATA%\MahfazatJeeb\runtime\node\node.exe" (
  set "NODE_DIR=%LOCALAPPDATA%\MahfazatJeeb\runtime\node"
)
if exist "runtime-path.txt" (
  set /p NODE_DIR=<runtime-path.txt
)
if defined NODE_DIR (
  set "PATH=%NODE_DIR%;%PATH%"
) else (
  where node >nul 2>&1
  if errorlevel 1 (
    echo.
    echo  Node.js غير موجود. شغّل Setup.bat للتثبيت.
    echo.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
    echo.
    echo  ملفات التطبيق ناقصة. أعد التثبيت.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo  تثبيت المكتبات لأول مرة...
    call npm install --omit=dev --no-audit --no-fund
    if errorlevel 1 (
        echo  فشل التثبيت.
        pause
        exit /b 1
    )
)

echo.
echo  ========================================
echo   محفظة جيب - كروت الشبكات
echo   لا تغلق هذه النافذة أثناء العمل
echo  ========================================
echo.

start "" "http://localhost:5173"
set APP_MODE=production
node server/index.js

pause
