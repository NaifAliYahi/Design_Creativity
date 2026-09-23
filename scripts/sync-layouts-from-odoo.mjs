#!/usr/bin/env node
/**
 * نسخ layouts من مديول Odoo إلى public/netcard/layouts/
 * المسار الافتراضي: d:\tempodoo\server\custom_addons\jaib_netcard\static\src\data\layouts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const defaultSrc = path.join(
  'd:',
  'tempodoo',
  'server',
  'custom_addons',
  'jaib_netcard',
  'static',
  'src',
  'data',
  'layouts'
);
const src = process.env.ODOO_NETCARD_LAYOUTS || defaultSrc;
const dst = path.join(root, '..', 'public', 'netcard', 'layouts');

if (!fs.existsSync(src)) {
  console.warn('⚠ تخطي نسخ Odoo (المجلد غير موجود على هذا الجهاز):', src);
  console.warn('   نستخدم layouts الموجودة في المستودع (Netlify / CI).');
  process.exit(0);
}

fs.mkdirSync(dst, { recursive: true });
const files = fs.readdirSync(src).filter((f) => f.endsWith('.json'));
const DEFAULT_W = 819;
const DEFAULT_H = 1024;
const posY = { name: 0.24, code: 0.54, phone: 0.78 };

for (const f of files) {
  const dest = path.join(dst, f);
  fs.copyFileSync(path.join(src, f), dest);
  const data = JSON.parse(fs.readFileSync(dest, 'utf8'));
  let changed = false;
  for (const layer of data.layers || []) {
    if (layer.x == null || !Number.isFinite(Number(layer.x))) {
      layer.x = DEFAULT_W * 0.42;
      changed = true;
    }
    if (layer.y == null || !Number.isFinite(Number(layer.y))) {
      layer.y = DEFAULT_H * (posY[layer.type] ?? 0.78);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(dest, JSON.stringify(data, null, 2), 'utf8');
}
console.log(`✓ نُسخ ${files.length} ملف layout → ${dst}`);
