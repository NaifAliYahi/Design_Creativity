#!/usr/bin/env node
/**
 * تجهيز حزمة رفع سيرفر الشركة — dist + server + public templates
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'deploy', 'server-package');
const templatesSrc = path.join(root, 'public', 'netcard', 'templates');
const templatesDst = path.join(outDir, 'public', 'netcard', 'templates');

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyFile(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

console.log('→ npm run sync:templates');
execSync('npm run sync:templates', { cwd: root, stdio: 'inherit' });

console.log('→ npm run build');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

console.log('→ node scripts/seed-users.mjs');
execSync('node scripts/seed-users.mjs', { cwd: root, stdio: 'inherit' });

if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

copyDir(path.join(root, 'dist'), path.join(outDir, 'dist'));
copyDir(path.join(root, 'server'), path.join(outDir, 'server'));
copyDir(templatesSrc, templatesDst);

for (const f of ['package.json', 'package-lock.json']) {
  copyFile(path.join(root, f), path.join(outDir, f));
}

copyFile(
  path.join(root, 'deploy', 'دليل-رفع-سيرفر-الشركة.md'),
  path.join(outDir, 'README-رفع-السيرفر.md')
);

const startBat = `@echo off
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
`;
fs.writeFileSync(path.join(outDir, 'تشغيل-السيرفر.bat'), startBat, 'utf8');

console.log(`\n✅ الحزمة جاهزة: ${outDir}`);
console.log('   انسخ المجلد server-package إلى سيرفر الشركة ثم شغّل تشغيل-السيرفر.bat');
