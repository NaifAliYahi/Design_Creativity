import crypto from 'crypto';

const SALT = 'cs-salt-v1:';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

export function hashPassword(password) {
  return crypto.createHash('sha256').update(`${SALT}${password}`).digest('hex');
}

export function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return s;
}

export function destroySession(token) {
  if (token) sessions.delete(token);
}

/** مسارات عامة — بدون تسجيل دخول */
const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/login']);

export function authMiddleware(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  if (PUBLIC_PATHS.has(req.path)) return next();
  if (req.method === 'GET' && req.path.startsWith('/api/netcard/templates')) return next();
  if (req.method === 'GET' && req.path.startsWith('/api/netcard/custom')) return next();

  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = session;
  next();
}

export function defaultUsers() {
  const base = [
    { username: 'admin', displayName: 'المدير', role: 'مدير', active: true },
    { username: '777465157', displayName: 'دعم فني', role: 'مدير', active: true },
    { username: 'user1', displayName: 'موظف 1', role: 'موظف', active: true },
  ];
  const hash = hashPassword('1234');
  return base.map((u, i) => ({
    ...u,
    id: `user-seed-${i + 1}`,
    passwordHash: hash,
  }));
}
