#!/usr/bin/env node
/**
 * دمج layouts Odoo في bundled-layouts.json (لـ Netlify) دون مسح store.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const layoutsDir = path.join(root, '..', 'public', 'netcard', 'layouts');
const bundledFile = path.join(root, '..', 'public', 'netcard', 'bundled-layouts.json');
const storeFile = path.join(root, '..', 'server', 'data', 'store.json');

let bundled = {};
if (fs.existsSync(bundledFile)) {
  bundled = JSON.parse(fs.readFileSync(bundledFile, 'utf8'));
}

/** قوالب Odoo JSON كأساس */
for (const f of fs.readdirSync(layoutsDir).filter((x) => x.endsWith('.json'))) {
  const code = f.replace('.json', '');
  const payload = JSON.parse(fs.readFileSync(path.join(layoutsDir, f), 'utf8'));
  if (!payload.layers?.length) continue;
  bundled[code] = {
    layers: payload.layers,
    background: bundled[code]?.background,
    updatedAt: Date.now(),
    source: 'odoo-layout-file',
  };
}

/** store.json يغلّب Odoo للقوالب المعدّلة من الموظف */
if (fs.existsSync(storeFile)) {
  const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  const fromStore = store.netcardTemplates || {};
  for (const [id, entry] of Object.entries(fromStore)) {
    if (entry?.layers?.length) {
      bundled[id] = { ...entry, updatedAt: entry.updatedAt || Date.now(), source: 'store' };
    }
  }
}

fs.writeFileSync(bundledFile, JSON.stringify(bundled, null, 2), 'utf8');
console.log(`✓ bundled-layouts.json — ${Object.keys(bundled).length} قالب (Odoo + store)`);
