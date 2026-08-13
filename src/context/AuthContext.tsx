import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, UserAccount } from '../types/auth';
import {
  login as authLogin,
  logout as authLogout,
  getSession,
  ensureUsers,
  changePassword,
  addUser,
  updateUser,
  deleteUser,
  loadUsers,
} from '../lib/auth';
import { getApiToken, isServerAvailable } from '../lib/api';

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isManager: boolean;
  users: UserAccount[];
  refreshUsers: () => Promise<void>;
  changeUserPassword: (userId: string, password: string) => Promise<void>;
  createUser: (
    u: Omit<UserAccount, 'id' | 'passwordHash'>,
    password: string
  ) => Promise<void>;
  updateUserAccount: (id: string, patch: Partial<UserAccount>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getSession());
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserAccount[]>([]);

  useEffect(() => {
    (async () => {
      const serverUp = await isServerAvailable();
      if (serverUp && getSession() && !getApiToken()) {
        authLogout();
        setSession(null);
      }
      try {
        await ensureUsers();
      } catch {
        /* offline or not logged in */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshUsers = useCallback(async () => {
    setUsers(await loadUsers());
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const s = await authLogin(username, password);
    if (s) {
      setSession(s);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setSession(null);
  }, []);

  const changeUserPassword = useCallback(async (userId: string, password: string) => {
    await changePassword(userId, password);
  }, []);

  const createUser = useCallback(
    async (u: Omit<UserAccount, 'id' | 'passwordHash'>, password: string) => {
      await addUser(u, password);
      await refreshUsers();
    },
    [refreshUsers]
  );

  const updateUserAccount = useCallback(
    async (id: string, patch: Partial<UserAccount>) => {
      await updateUser(id, patch);
      await refreshUsers();
    },
    [refreshUsers]
  );

  const removeUser = useCallback(
    async (id: string) => {
      await deleteUser(id);
      await refreshUsers();
    },
    [refreshUsers]
  );

  const isManager = session?.role === 'مدير' || session?.role === 'مشرف';

  const value = useMemo(
    () => ({
      session,
      loading,
      login,
      logout,
      isManager,
      users,
      refreshUsers,
      changeUserPassword,
      createUser,
      updateUserAccount,
      removeUser,
    }),
    [session, loading, login, logout, isManager, users, refreshUsers, changeUserPassword, createUser, updateUserAccount, removeUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
