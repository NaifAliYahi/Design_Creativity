@echo off
title Install - Pocket Wallet Network Cards
cd /d "%~dp0"

if not exist "app\dist\index.html" (
    if not exist "dist\index.html" (
        echo.
        echo  ERROR: dist folder missing!
        echo  Extract the FULL zip file first.
        echo  You need folder: app\dist\
        echo.
        pause
        exit /b 1
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\MahfazatJeeb-Setup.ps1"