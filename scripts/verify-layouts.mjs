#!/usr/bin/env node
/**
 * التحقق من صحة ملفات layout (Odoo) و bundled-layouts.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const layoutsDir = path.join(root, '..', 'public', 'netcard', 'layouts');
const bundledFile = path.join(root, '..', 'public', 'netcard', 'bundled-layouts.json');

const REQUIRED_TYPES = ['name', 'code', 'phone'];
let errors = 0;

function fail(msg) {
  console.error('❌', msg);
  errors++;
}

function ok(msg) {
  console.log('✓', msg);
}

function validateLayers(layers, context) {
  if (!Array.isArray(layers)) {
    fail(`${context}: layers ليست مصفوفة`);
    return;
  }
  if (layers.length < 3) {
    fail(`${context}: أقل من 3 طبقات (${layers.length})`);
  }
  for (const type of REQUIRED_TYPES) {
    if (!layers.some((l) => l && l.type === type)) {
      fail(`${context}: مفقود type=${type}`);
    }
  }
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!l || typeof l !== 'object') {
      fail(`${context}: طبقة ${i} غير صالحة`);
      continue;
    }
    if (typeof l.x !== 'number' || typeof l.y !== 'number') {
      fail(`${context}: طبقة ${i} بدون x/y`);
    }
    if (typeof l.fontSize !== 'number') {
      fail(`${context}: طبقة ${i} بدون fontSize`);
    }
  }
}

// --- layouts/*.json ---
const expected = Array.from({ length: 17 }, (_, i) => `template${i + 1}.json`);
const found = fs.existsSync(layoutsDir)
  ? fs.readdirSync(layoutsDir).filter((f) => f.endsWith('.json')).sort()
  : [];

for (const f of expected) {
  if (!found.includes(f)) fail(`ملف مفقود: layouts/${f}`);
}
for (const f of found) {
  const filePath = path.join(layoutsDir, f);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    fail(`JSON غير صالح: ${f} — ${e.message}`);
    continue;
  }
  const code = f.replace('.json', '');
  if (data.template_code && data.template_code !== code) {
    fail(`${f}: template_code=${data.template_code} ≠ ${code}`);
  }
  validateLayers(data.layers, `layouts/${f}`);
}
if (found.length === 17) ok(`17 ملف layout في public/netcard/layouts`);

// --- bundled-layouts.json ---
if (fs.existsSync(bundledFile)) {
  let bundled;
  try {
    bundled = JSON.parse(fs.readFileSync(bundledFile, 'utf8'));
  } catch (e) {
    fail(`bundled-layouts.json: ${e.message}`);
    bundled = null;
  }
  if (bundled && typeof bundled === 'object') {
    const keys = Object.keys(bundled).filter((k) => !k.startsWith('_'));
    ok(`bundled-layouts: ${keys.length} قالب`);
    for (const key of keys.slice(0, 5)) {
      const entry = bundled[key];
      if (entry?.layers) validateLayers(entry.layers, `bundled/${key}`);
    }
  }
} else {
  console.log('ℹ bundled-layouts.json غير موجود (اختياري)');
}

if (errors) {
  console.error(`\nفشل التحقق: ${errors} خطأ`);
  process.exit(1);
}
console.log('\n✅ كل فحوصات layouts ناجحة');
