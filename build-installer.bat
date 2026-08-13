@echo off
title Build installer package
cd /d "%~dp0"

echo.
echo  [1/4] Building application...
call npm install
if errorlevel 1 goto fail
call npm run build
if errorlevel 1 goto fail

echo.
echo  [2/4] Preparing installer folder...
set "RELEASE=release\MahfazatJeeb-Installer"
if exist "%RELEASE%" rmdir /s /q "%RELEASE%"
mkdir "%RELEASE%"
mkdir "%RELEASE%\installer"
mkdir "%RELEASE%\app"

echo.
echo  [3/4] Copying files...
if not exist "dist\index.html" (
    echo  ERROR: dist not built! Run npm run build first.
    goto fail
)
xcopy /E /I /Y dist "%RELEASE%\app\dist" >nul
if not exist "%RELEASE%\app\dist\index.html" (
    echo  ERROR: dist copy failed!
    goto fail
)
xcopy /E /I /Y server "%RELEASE%\app\server" >nul
xcopy /E /I /Y public "%RELEASE%\app\public" >nul
xcopy /E /I /Y scripts "%RELEASE%\app\scripts" >nul
copy /Y package.json "%RELEASE%\app\" >nul
copy /Y package-lock.json "%RELEASE%\app\" >nul
copy /Y run-app.bat "%RELEASE%\app\" >nul
copy /Y installer\MahfazatJeeb-Setup.ps1 "%RELEASE%\installer\" >nul
copy /Y installer\uninstall.ps1 "%RELEASE%\installer\" >nul
copy /Y Setup.bat "%RELEASE%\" >nul
copy /Y deploy\README-employee.txt "%RELEASE%\README.txt" >nul

echo.
echo  [4/4] Creating ZIP...
powershell -NoProfile -Command "Compress-Archive -Path 'release/MahfazatJeeb-Installer/*' -DestinationPath 'release/MahfazatJeeb-Installer.zip' -Force"

echo.
echo  DONE: release\MahfazatJeeb-Installer.zip
echo  Send ZIP to employees - run Setup.bat inside
pause
exit /b 0

:fail
echo Build failed.
pause
exit /b 1