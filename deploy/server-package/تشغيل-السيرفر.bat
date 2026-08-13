@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo جاري تثبيت الحزم...
  call npm ci --omit=dev
)
set APP_MODE=production
set NODE_ENV=production
echo.
echo  النظام يعمل على: http://localhost:5173
echo  تسجيل الدخول: /login
echo.
node server/index.js
pause
