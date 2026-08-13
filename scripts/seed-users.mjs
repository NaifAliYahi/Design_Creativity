#!/usr/bin/env node
/**
 * إضافة/تحديث حسابات الموظفين في store.json (بدون مسح بيانات العملاء)
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));
const storeFile = path.join(root, '..', 'server', 'data', 'store.json');

function hashPassword(password) {
  return crypto.createHash('sha256').update(`cs-salt-v1:${password}`).digest('hex');
}

const TO_SEED = [
  { username: '777465157', displayName: 'دعم فني', role: 'مدير', active: true, password: '1234' },
  { username: 'user1', displayName: 'موظف 1', role: 'موظف', active: true, password: '1234' },
  { username: 'admin', displayName: 'المدير', role: 'مدير', active: true, password: '1234' },
];

let store = {};
if (fs.existsSync(storeFile)) {
  store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
}

const users = Array.isArray(store.users) ? [...store.users] : [];

for (const spec of TO_SEED) {
  const hash = hashPassword(spec.password);
  const idx = users.findIndex((u) => u.username.toLowerCase() === spec.username.toLowerCase());
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      displayName: spec.displayName,
      role: spec.role,
      active: true,
      passwordHash: hash,
    };
    console.log(`✓ تحديث: ${spec.username}`);
  } else {
    users.push({
      id: `user-${spec.username}-${Date.now()}`,
      username: spec.username,
      displayName: spec.displayName,
      role: spec.role,
      active: true,
      passwordHash: hash,
    });
    console.log(`✓ إضافة: ${spec.username}`);
  }
}

store.users = users;
store._updatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(storeFile), { recursive: true });
fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), 'utf8');
console.log(`\nتم — ${users.length} مستخدم في ${storeFile}`);
