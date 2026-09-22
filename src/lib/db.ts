import { openDB, type IDBPDatabase } from 'idb';
import type { AppData } from '../types';
import type { UserAccount } from '../types/auth';
import type { TemplateStoreEntry, CustomTemplate } from './netcard/types';
import { defaultData } from './storage';
import { STORAGE_KEY } from '../constants';
import { STORAGE_KEY as NETCARD_LS_KEY, CUSTOM_TEMPLATES_LS_KEY } from './netcard/constants';
import { ensureResponseTemplates } from './responses';
import { api, isServerAvailable, getApiToken } from './api';
import { assetUrl } from './assetUrl';

const DB_NAME = 'cs-operations-db';
const DB_VERSION = 3;
const DATA_KEY = 'main';
const USERS_KEY = 'users';

export interface CSDB {
  appData: { key: string; value: AppData };
  users: { key: string; value: UserAccount[] };
  netcardTemplates: { key: string; value: TemplateStoreEntry };
  netcardCustomTemplates: { key: string; value: CustomTemplate };
}

let dbPromise: Promise<IDBPDatabase<CSDB>> | null = null;
let useServer = false;
let bundledLayoutsCache: Record<string, TemplateStoreEntry> | null = null;

async function loadBundledLayouts(): Promise<Record<string, TemplateStoreEntry>> {
  if (bundledLayoutsCache) return bundledLayoutsCache;
  try {
    const r = await fetch(assetUrl('netcard/bundled-layouts.json'), { cache: 'no-cache' });
    if (r.ok) {
      bundledLayoutsCache = (await r.json()) as Record<string, TemplateStoreEntry>;
      return bundledLayoutsCache;
    }
  } catch {
    /* static file optional */
  }
  bundledLayoutsCache = {};
  return bundledLayoutsCache;
}

async function initStorageMode(): Promise<boolean> {
  useServer = await isServerAvailable();
  return useServer;
}

function getLocalDB() {
  if (!dbPromise) {
    dbPromise = openDB<CSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('appData')) db.createObjectStore('appData');
        if (!db.objectStoreNames.contains('users')) db.createObjectStore('users');
        if (oldVersion < 2 && !db.objectStoreNames.contains('netcardTemplates')) {
          db.createObjectStore('netcardTemplates');
        }
        if (oldVersion < 3 && !db.objectStoreNames.contains('netcardCustomTemplates')) {
          db.createObjectStore('netcardCustomTemplates');
        }
      },
    });
  }
  return dbPromise;
}

function migrateFromLocalStorage(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

async function loadLocalAppData(): Promise<AppData | null> {
  const db = await getLocalDB();
  return (await db.get('appData', DATA_KEY)) ?? null;
}

async function saveLocalAppData(data: AppData): Promise<void> {
  const db = await getLocalDB();
  await db.put('appData', data, DATA_KEY);
}

/** ترحيل من IndexedDB/localStorage إلى خادم SQLite عند أول اتصال */
async function migrateLocalToServer(local: AppData): Promise<AppData> {
  const patched = { ...local, responseTemplates: ensureResponseTemplates(local) };
  await api.putData(patched);
  await saveLocalAppData(patched);
  localStorage.removeItem(STORAGE_KEY);
  return patched;
}

export async function loadAppData(): Promise<AppData> {
  await initStorageMode();

  if (useServer) {
    if (!getApiToken()) {
      const local = (await loadLocalAppData()) ?? migrateFromLocalStorage();
      if (local) return local;
      return defaultData();
    }

    try {
      let stored = (await api.getData()) as AppData | null;
      if (stored) {
        const templates = ensureResponseTemplates(stored);
        if (!stored.responseTemplates?.length) {
          const patched = { ...stored, responseTemplates: templates };
          await api.putData(patched);
          return patched;
        }
        return stored;
      }
    } catch {
      const local = (await loadLocalAppData()) ?? migrateFromLocalStorage();
      if (local) return local;
      return defaultData();
    }

    const local = (await loadLocalAppData()) ?? migrateFromLocalStorage();
    if (local) return migrateLocalToServer(local);

    const data = defaultData();
    const seeded = { ...data, responseTemplates: ensureResponseTemplates(data) };
    await api.putData(seeded);
    return seeded;
  }

  const db = await getLocalDB();
  const stored = await db.get('appData', DATA_KEY);
  if (stored) {
    const templates = ensureResponseTemplates(stored);
    if (!stored.responseTemplates?.length) {
      const patched = { ...stored, responseTemplates: templates };
      await db.put('appData', patched, DATA_KEY);
      return patched;
    }
    return stored;
  }

  const migrated = migrateFromLocalStorage();
  let data = migrated ?? defaultData();
  data = { ...data, responseTemplates: ensureResponseTemplates(data) };
  await db.put('appData', data, DATA_KEY);
  if (migrated) localStorage.removeItem(STORAGE_KEY);
  return data;
}

export async function saveAppData(data: AppData): Promise<void> {
  await initStorageMode();
  if (useServer) {
    await api.putData(data);
  }
  await saveLocalAppData(data);
}

export async function loadUsers(): Promise<UserAccount[]> {
  await initStorageMode();
  if (useServer) {
    if (!getApiToken()) return [];
    try {
      const users = await api.getUsers();
      if (users.length) return users as UserAccount[];
    } catch {
      return [];
    }
    return [];
  }
  const db = await getLocalDB();
  return (await db.get('users', USERS_KEY)) ?? [];
}

export async function saveUsers(users: UserAccount[]): Promise<void> {
  await initStorageMode();
  if (useServer) await api.putUsers(users);
  const db = await getLocalDB();
  await db.put('users', users, USERS_KEY);
}

export async function resetAllData(): Promise<AppData> {
  const data = defaultData();
  await initStorageMode();
  if (useServer) await api.putData(data);
  await saveLocalAppData(data);
  return data;
}

async function migrateNetcardFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(NETCARD_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, TemplateStoreEntry>;
    await initStorageMode();
    if (useServer) {
      const store: Record<string, TemplateStoreEntry> = {};
      for (const [id, entry] of Object.entries(parsed)) {
        store[id] = { ...entry, updatedAt: Date.now() };
      }
      for (const [id, entry] of Object.entries(store)) {
        await api.putNetcardTemplate(id, entry);
      }
    } else {
      const db = await getLocalDB();
      for (const [id, entry] of Object.entries(parsed)) {
        await db.put('netcardTemplates', { ...entry, updatedAt: Date.now() }, id);
      }
    }
    localStorage.removeItem(NETCARD_LS_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadNetcardTemplateStore(): Promise<Record<string, TemplateStoreEntry>> {
  await migrateNetcardFromLocalStorage();
  await initStorageMode();

  if (useServer) {
    try {
      const remote = (await api.getNetcardTemplates()) as Record<string, TemplateStoreEntry>;
      const bundled = await loadBundledLayouts();
      return { ...bundled, ...remote };
    } catch {
      return loadBundledLayouts();
    }
  }

  const db = await getLocalDB();
  const keys = await db.getAllKeys('netcardTemplates');
  const store: Record<string, TemplateStoreEntry> = {};
  for (const key of keys) {
    const entry = await db.get('netcardTemplates', key);
    if (entry) store[String(key)] = entry;
  }
  const bundled = await loadBundledLayouts();
  return { ...bundled, ...store };
}

export async function saveNetcardTemplateEntry(id: string, entry: TemplateStoreEntry): Promise<void> {
  const payload = { ...entry, updatedAt: Date.now() };
  await initStorageMode();
  if (useServer) {
    await api.putNetcardTemplate(id, payload);
    return;
  }
  const db = await getLocalDB();
  await db.put('netcardTemplates', payload, id);
}

export async function deleteNetcardTemplateEntry(id: string): Promise<void> {
  await initStorageMode();
  if (useServer) await api.deleteNetcardTemplate(id);
  const db = await getLocalDB();
  await db.delete('netcardTemplates', id);
}

async function migrateCustomTemplatesFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { name: string; base64: string; thumb?: string }[];
    await initStorageMode();
    for (const item of parsed) {
      if (!item.name || !item.base64) continue;
      const entry: CustomTemplate = {
        id: item.name,
        label: item.name.startsWith('custom-') ? 'قالب مخصص' : item.name,
        base64: item.base64,
        thumb: item.thumb || item.base64,
        createdAt: Date.now(),
      };
      if (useServer) await api.putNetcardCustom(entry);
      else {
        const db = await getLocalDB();
        await db.put('netcardCustomTemplates', entry, entry.id);
      }
    }
    localStorage.removeItem(CUSTOM_TEMPLATES_LS_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadNetcardCustomTemplates(): Promise<CustomTemplate[]> {
  await migrateCustomTemplatesFromLocalStorage();
  await initStorageMode();

  if (useServer) {
    const list = (await api.getNetcardCustom()) as CustomTemplate[];
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  const db = await getLocalDB();
  const all = await db.getAll('netcardCustomTemplates');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveNetcardCustomTemplate(entry: CustomTemplate): Promise<void> {
  await initStorageMode();
  if (useServer) {
    await api.putNetcardCustom(entry);
    return;
  }
  const db = await getLocalDB();
  await db.put('netcardCustomTemplates', entry, entry.id);
}

export async function deleteNetcardCustomTemplate(id: string): Promise<void> {
  await initStorageMode();
  if (useServer) await api.deleteNetcardCustom(id);
  const db = await getLocalDB();
  await db.delete('netcardCustomTemplates', id);
}

/** هل البيانات تُحفظ على الخادم (SQLite في المشروع)؟ */
export async function getStorageInfo(): Promise<{ mode: 'server' | 'local'; label: string }> {
  const server = await initStorageMode();
  return server
    ? { mode: 'server', label: 'SQLite — server/data/app.db (مشترك بين الموظفين والعملاء)' }
    : { mode: 'local', label: 'IndexedDB — محلي على هذا المتصفح فقط (لا يُستخدم للإنتاج)' };
}
