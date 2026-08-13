#!/usr/bin/env node
/**
 * ينسخ صور TempNew إلى template1.jpg … template17.jpg
 * المصدر: public/netcard/templates/ (أسماء tempNew*.jpeg و 2.jpeg …)
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public', 'netcard', 'templates');

const map = {
  tempNew1: 'template1.jpg',
  tempNew2: 'template2.jpg',
  tempNew3: 'template3.jpg',
  tempNew4: 'template4.jpg',
  tempNew5: 'template5.jpg',
  tempNew6: 'template6.jpg',
  tempNew7: 'template7.jpg',
  tempNew8: 'template8.jpg',
  tempNew9: 'template9.jpg',
  tempNew10: 'template10.jpg',
  '2': 'template11.jpg',
  '3': 'template12.jpg',
  '4': 'template13.jpg',
  '5': 'template14.jpg',
  '6': 'template15.jpg',
  '8': 'template16.jpg',
  '9': 'template17.jpg',
};

let ok = 0;
for (const [base, out] of Object.entries(map)) {
  const src = [join(dir, `${base}.jpeg`), join(dir, `${base}.jpg`), join(dir, `${base}.png`)].find(
    existsSync
  );
  if (!src) {
    console.warn(`⚠ لم يُعثر على ${base}.*`);
    continue;
  }
  copyFileSync(src, join(dir, out));
  console.log(`✓ ${out}`);
  ok++;
}

if (ok === 0) {
  console.error('لم تُنسخ أي قوالب — ضع الصور في public/netcard/templates/');
  process.exit(1);
}
console.log(`\nتم: ${ok}/17 قالب`);
