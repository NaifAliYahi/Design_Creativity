import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  authMiddleware,
  createSession,
  defaultUsers,
  destroySession,
  hashPassword,
  syncDefaultUsers,
} from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const HAS_DIST = fs.existsSync(path.join(DIST_DIR, 'index.html'));
const IS_PROD =
  process.env.APP_MODE === 'production' || process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || (IS_PROD ? 5173 : 3001);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    }
  } catch {
    /* corrupt file — start fresh */
  }
  return {};
}

function writeStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function getJson(key) {
  const store = readStore();
  return store[key] ?? null;
}

function setJson(key, value) {
  const store = readStore();
  store[key] = value;
  store._updatedAt = new Date().toISOString();
  writeStore(store);
}

function deleteKey(key) {
  const store = readStore();
  delete store[key];
  store._updatedAt = new Date().toISOString();
  writeStore(store);
}

function ensureUsers() {
  let users = getJson('users');
  if (!Array.isArray(users) || users.length === 0) {
    users = defaultUsers();
  } else {
    users = syncDefaultUsers(users);
  }
  setJson('users', users);
  return users;
}

function requireManager(req, res) {
  if (req.user?.role !== 'مدير') {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '80mb' }));
app.use(authMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, store: STORE_FILE, time: new Date().toISOString(), auth: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }
  const users = ensureUsers();
  const hash = hashPassword(String(password));
  const user = users.find(
    (u) => u.active && u.username.toLowerCase() === String(username).trim().toLowerCase()
  );
  if (!user || user.passwordHash !== hash) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const token = createSession(user);
  res.json({
    token,
    session: {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loginAt: new Date().toISOString(),
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  destroySession(token);
  res.json({ ok: true });
});

app.get('/api/data', (req, res) => {
  res.json(getJson('appData'));
});

app.put('/api/data', (req, res) => {
  setJson('appData', req.body);
  res.json({ ok: true });
});

app.delete('/api/data', (req, res) => {
  if (!requireManager(req, res)) return;
  deleteKey('appData');
  res.json({ ok: true });
});

app.get('/api/users', (req, res) => {
  if (!requireManager(req, res)) return;
  res.json(getJson('users') ?? []);
});

app.put('/api/users', (req, res) => {
  if (!requireManager(req, res)) return;
  setJson('users', req.body);
  res.json({ ok: true });
});

app.get('/api/netcard/templates', (_req, res) => {
  res.json(getJson('netcardTemplates') ?? {});
});

app.put('/api/netcard/templates/:id', (req, res) => {
  const store = getJson('netcardTemplates') ?? {};
  store[req.params.id] = { ...req.body, updatedAt: Date.now() };
  setJson('netcardTemplates', store);
  res.json({ ok: true });
});

app.delete('/api/netcard/templates/:id', (req, res) => {
  const store = getJson('netcardTemplates') ?? {};
  delete store[req.params.id];
  setJson('netcardTemplates', store);
  res.json({ ok: true });
});

app.get('/api/netcard/custom', (_req, res) => {
  res.json(getJson('netcardCustom') ?? []);
});

app.put('/api/netcard/custom', (req, res) => {
  const list = getJson('netcardCustom') ?? [];
  const entry = req.body;
  const idx = list.findIndex((x) => x.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  setJson('netcardCustom', list);
  res.json({ ok: true });
});

app.delete('/api/netcard/custom/:id', (req, res) => {
  const list = (getJson('netcardCustom') ?? []).filter((x) => x.id !== req.params.id);
  setJson('netcardCustom', list);
  res.json({ ok: true });
});

if (IS_PROD && HAS_DIST) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  ensureUsers();
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ✅ قاعدة البيانات: ${STORE_FILE}`);
  console.log(`  🔐 تسجيل الدخول مطلوب للبيانات الحساسة`);
  console.log(`  🌐 ${IS_PROD && HAS_DIST ? 'النظام جاهز' : 'API'}: ${url}`);
  if (IS_PROD && HAS_DIST) console.log(`  📌 افتح المتصفح: ${url}/login`);
  console.log('');
});
