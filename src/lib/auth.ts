import type { UserAccount, AuthSession } from '../types/auth';
import { uid } from '../constants';
import { loadUsers, saveUsers } from './db';
import { api, isServerAvailable, setApiToken } from './api';
import { syncCatalogAfterLogin } from './netcard/catalog';

const SESSION_KEY = 'cs-auth-session';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`cs-salt-v1:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createDefaultUsers(): Promise<UserAccount[]> {
  const defaults: Omit<UserAccount, 'id' | 'passwordHash'>[] = [
    { username: 'admin', displayName: 'المدير', role: 'مدير', active: true },
    { username: '777465157', displayName: 'دعم فني', role: 'مدير', active: true },
    { username: 'user1', displayName: 'موظف 1', role: 'موظف', active: true },
  ];
  const users: UserAccount[] = [];
  for (const u of defaults) {
    users.push({
      ...u,
      id: uid(),
      passwordHash: await hashPassword('1234'),
    });
  }
  await saveUsers(users);
  return users;
}

export async function ensureUsers(): Promise<UserAccount[]> {
  let users = await loadUsers();
  if (users.length === 0) {
    users = await createDefaultUsers();
  }
  return users;
}

export async function login(username: string, password: string): Promise<AuthSession | null> {
  const serverUp = await isServerAvailable();
  if (serverUp) {
    try {
      const res = await api.login(username, password);
      const session = res.session as AuthSession;
      setApiToken(res.token);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      await syncCatalogAfterLogin().catch(() => {});
      return session;
    } catch {
      /* السيرفر شغّال — لا دخول محلي (لا token = لا حفظ مشترك) */
      return null;
    }
  }

  const users = await ensureUsers();
  const hash = await hashPassword(password);
  const user = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.active
  );
  if (!user || user.passwordHash !== hash) return null;

  const session: AuthSession = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    loginAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function logout(): void {
  void api.logout();
  setApiToken(null);
  sessionStorage.removeItem(SESSION_KEY);
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const users = await loadUsers();
  const hash = await hashPassword(newPassword);
  await saveUsers(users.map((u) => (u.id === userId ? { ...u, passwordHash: hash } : u)));
}

export async function addUser(
  user: Omit<UserAccount, 'id' | 'passwordHash'>,
  password: string
): Promise<UserAccount> {
  const users = await loadUsers();
  const newUser: UserAccount = {
    ...user,
    id: uid(),
    passwordHash: await hashPassword(password),
  };
  await saveUsers([...users, newUser]);
  return newUser;
}

export async function updateUser(id: string, patch: Partial<UserAccount>): Promise<void> {
  const users = await loadUsers();
  await saveUsers(users.map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

export async function deleteUser(id: string): Promise<void> {
  const users = await loadUsers();
  await saveUsers(users.filter((u) => u.id !== id));
}

export { hashPassword, loadUsers, saveUsers };
