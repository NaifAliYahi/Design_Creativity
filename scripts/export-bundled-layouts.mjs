#!/usr/bin/env node
/**
 * تصدير مواقع الليبلات من store.json → public/netcard/bundled-layouts.json
 * ليستخدمها العملاء على Netlify (بدون سيرفر)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const storeFile = path.join(root, '..', 'server', 'data', 'store.json');
const outFile = path.join(root, '..', 'public', 'netcard', 'bundled-layouts.json');
const outDir = path.dirname(outFile);

let templates = {};
if (fs.existsSync(storeFile)) {
  try {
    const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
    if (store.netcardTemplates && typeof store.netcardTemplates === 'object') {
      templates = store.netcardTemplates;
    }
  } catch (e) {
    console.warn('⚠ تعذر قراءة store.json:', e.message);
  }
} else {
  console.log('ℹ store.json غير موجود — يُستخدم الملف الحالي إن وُجد');
  if (fs.existsSync(outFile)) {
    console.log('✓ bundled-layouts.json موجود مسبقاً — لم يُمس');
    process.exit(0);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(templates, null, 2), 'utf8');
const count = Object.keys(templates).length;
console.log(`✓ bundled-layouts.json — ${count} قالب`);
