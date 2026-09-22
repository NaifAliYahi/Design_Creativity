import { BUILTIN_TEMPLATES, TEMPLATE_LABELS } from './constants';
import type {
  CatalogKindItem,
  CatalogTemplateItem,
  NetcardCatalogSnapshot,
  NetcardCatalogState,
  TemplateCatalogMeta,
} from './catalog-types';
import type { CustomTemplate } from './types';
import { api, getApiToken, isServerAvailable } from '../api';

const LS_CATALOG_KEY = 'mahfazat-netcard-catalog-v1';

type DefaultsFile = {
  types: CatalogKindItem[];
  wallets: CatalogKindItem[];
  templates: Record<string, TemplateCatalogMeta>;
};

let defaultsCache: DefaultsFile | null = null;

async function loadDefaultsFile(): Promise<DefaultsFile> {
  if (defaultsCache) return defaultsCache;
  const r = await fetch('/netcard/catalog-defaults.json', { cache: 'no-store' });
  const text = await r.text();
  defaultsCache = JSON.parse(text.replace(/^\uFEFF/, '')) as DefaultsFile;
  return defaultsCache;
}

function slugId(prefix: string, name: string): string {
  const base = name.trim().replace(/\s+/g, '-').slice(0, 40) || 'item';
  return `${prefix}-${base}-${Date.now().toString(36)}`;
}

function readLocalCatalog(): NetcardCatalogState | null {
  try {
    const raw = localStorage.getItem(LS_CATALOG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NetcardCatalogState;
  } catch {
    return null;
  }
}

function writeLocalCatalog(state: NetcardCatalogState): void {
  localStorage.setItem(LS_CATALOG_KEY, JSON.stringify(state));
}

function normalizeWalletItem(item: CatalogKindItem): CatalogKindItem {
  if (item.id === 'wallet-dewali' || item.name?.includes('دوالي')) {
    return { ...item, id: 'wallet-jawali', name: 'محفظة جوالي', code: 'jawali' };
  }
  return item;
}

function mergeKindItems(a: CatalogKindItem[], b: CatalogKindItem[]): CatalogKindItem[] {
  const map = new Map<string, CatalogKindItem>();
  for (const item of a) {
    const n = normalizeWalletItem(item);
    map.set(n.id, n);
  }
  for (const item of b) {
    const n = normalizeWalletItem(item);
    map.set(n.id, n);
  }
  map.delete('wallet-dewali');
  return [...map.values()];
}

function mergeCatalogLayers(
  defaults: NetcardCatalogState,
  remote: Partial<NetcardCatalogState> | null,
  local: NetcardCatalogState | null
): NetcardCatalogState {
  const remoteTypes = (remote?.types as CatalogKindItem[] | undefined) ?? [];
  const remoteWallets = (remote?.wallets as CatalogKindItem[] | undefined) ?? [];
  const localTypes = local?.types ?? [];
  const localWallets = local?.wallets ?? [];
  return {
    types: mergeKindItems(mergeKindItems(defaults.types, remoteTypes), localTypes),
    wallets: mergeKindItems(mergeKindItems(defaults.wallets, remoteWallets), localWallets),
    templateMeta: {
      ...defaults.templateMeta,
      ...(remote?.templateMeta ?? {}),
      ...(local?.templateMeta ?? {}),
    },
  };
}

export async function fetchCatalogState(): Promise<NetcardCatalogState> {
  const defaultsFile = await loadDefaultsFile();
  const defaults: NetcardCatalogState = {
    types: [...defaultsFile.types],
    wallets: [...defaultsFile.wallets],
    templateMeta: { ...defaultsFile.templates },
  };

  const local = readLocalCatalog();
  const serverUp = await isServerAvailable();

  if (serverUp) {
    try {
      const remote = await api.getNetcardCatalogPublic();
      return mergeCatalogLayers(defaults, remote as Partial<NetcardCatalogState>, null);
    } catch {
      /* fall through */
    }
  }

  if (local && !serverUp) {
    return mergeCatalogLayers(defaults, null, local);
  }
  return defaults;
}

/** بعد تسجيل الدخول: دمج محلي + سيرver + defaults ثم حفظ في SQLite */
export async function syncCatalogAfterLogin(): Promise<CatalogPersistResult> {
  if (!(await isServerAvailable()) || !getApiToken()) return 'local-only';
  const defaultsFile = await loadDefaultsFile();
  const defaults: NetcardCatalogState = {
    types: [...defaultsFile.types],
    wallets: [...defaultsFile.wallets],
    templateMeta: { ...defaultsFile.templates },
  };
  const local = readLocalCatalog();
  let remote: Partial<NetcardCatalogState> | null = null;
  try {
    remote = (await api.getNetcardCatalogPublic()) as Partial<NetcardCatalogState>;
  } catch {
    remote = null;
  }
  const merged = mergeCatalogLayers(defaults, remote, local);
  try {
    await api.putNetcardCatalog(merged);
    return 'server';
  } catch {
    return 'local-only';
  }
}

export type CatalogPersistResult = 'server' | 'local-only' | 'local-no-server';

/** حفظ الكatalog: مشترك على السيرفر فقط بعد تسجيل دخول الموظف */
export async function persistCatalogState(state: NetcardCatalogState): Promise<CatalogPersistResult> {
  if (!(await isServerAvailable())) {
    writeLocalCatalog(state);
    return 'local-no-server';
  }
  if (!getApiToken()) {
    writeLocalCatalog(state);
    return 'local-only';
  }
  try {
    await api.putNetcardCatalog(state);
    return 'server';
  } catch {
    writeLocalCatalog(state);
    return 'local-only';
  }
}

function resolveKindName(items: CatalogKindItem[], id: string | null | undefined, fallback: string): string {
  if (!id) return fallback;
  return items.find((x) => x.id === id)?.name ?? fallback;
}

export function buildCatalogTemplates(
  state: NetcardCatalogState,
  customTemplates: CustomTemplate[]
): CatalogTemplateItem[] {
  const builtins: CatalogTemplateItem[] = BUILTIN_TEMPLATES.map((t) => {
    const meta = state.templateMeta[t.id] ?? {};
    const typeId = meta.typeId ?? null;
    const walletId = meta.walletId ?? null;
    return {
      id: t.id,
      name: meta.name ?? TEMPLATE_LABELS[t.id] ?? t.label,
      typeId,
      typeName: resolveKindName(state.types, typeId, 'كل الأنواع'),
      walletId,
      walletName: resolveKindName(state.wallets, walletId, 'كل المحافظ'),
      groupName: meta.groupName ?? '',
      isBuiltin: true,
      featured: meta.featured ?? t.featured,
      imageFilename: `${t.id}.jpg`,
    };
  });

  const customs: CatalogTemplateItem[] = customTemplates.map((c) => {
    const meta = state.templateMeta[c.id] ?? {};
    const typeId = meta.typeId ?? c.typeId ?? null;
    const walletId = meta.walletId ?? c.walletId ?? null;
    return {
      id: c.id,
      name: meta.name ?? c.label,
      typeId,
      typeName: resolveKindName(state.types, typeId, 'كل الأنواع'),
      walletId,
      walletName: resolveKindName(state.wallets, walletId, 'كل المحافظ'),
      groupName: meta.groupName ?? c.groupName ?? 'مرفوع محلياً',
      isBuiltin: false,
      isCustom: true,
      imageFilename: c.label,
    };
  });

  return [...customs, ...builtins];
}

export function templateGroups(templates: CatalogTemplateItem[]): CatalogKindItem[] {
  const names = [...new Set(templates.map((t) => t.groupName).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ar')
  );
  return names.map((name) => ({ id: name, name }));
}

export type TemplateFilterOptions = {
  typeId?: string;
  walletId?: string;
  groupName?: string;
  query?: string;
};

export function filterCatalogTemplates(
  templates: CatalogTemplateItem[],
  opts: TemplateFilterOptions
): CatalogTemplateItem[] {
  const query = (opts.query ?? '').trim().toLowerCase();
  return templates.filter((template) => {
    const haystack = [template.name, template.groupName, template.imageFilename, template.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (opts.typeId && template.typeId !== opts.typeId) return false;
    if (opts.walletId && template.walletId !== opts.walletId) return false;
    if (opts.groupName && template.groupName !== opts.groupName) return false;
    return true;
  });
}

export async function addCatalogKind(
  state: NetcardCatalogState,
  kind: 'type' | 'wallet',
  name: string
): Promise<{ state: NetcardCatalogState; persist: CatalogPersistResult }> {
  const trimmed = name.trim();
  if (!trimmed) return { state, persist: 'local-no-server' };
  const list = kind === 'type' ? state.types : state.wallets;
  if (list.some((x) => x.name === trimmed)) return { state, persist: 'local-no-server' };
  const item: CatalogKindItem = { id: slugId(kind, trimmed), name: trimmed };
  const next: NetcardCatalogState = {
    ...state,
    types: kind === 'type' ? [...state.types, item] : state.types,
    wallets: kind === 'wallet' ? [...state.wallets, item] : state.wallets,
  };
  const persist = await persistCatalogState(next);
  return { state: next, persist };
}

export async function removeCatalogKind(
  state: NetcardCatalogState,
  kind: 'type' | 'wallet',
  id: string
): Promise<{ state: NetcardCatalogState; persist: CatalogPersistResult }> {
  const field = kind === 'type' ? 'typeId' : 'walletId';
  const inUse = Object.values(state.templateMeta).some((m) => m[field] === id);
  if (inUse) throw new Error('لا يمكن الحذف — مرتبط بقوالب.');
  const next: NetcardCatalogState = {
    ...state,
    types: kind === 'type' ? state.types.filter((t) => t.id !== id) : state.types,
    wallets: kind === 'wallet' ? state.wallets.filter((w) => w.id !== id) : state.wallets,
  };
  const persist = await persistCatalogState(next);
  return { state: next, persist };
}

export async function setTemplateMeta(
  state: NetcardCatalogState,
  templateId: string,
  meta: TemplateCatalogMeta
): Promise<{ state: NetcardCatalogState; persist: CatalogPersistResult }> {
  const next: NetcardCatalogState = {
    ...state,
    templateMeta: {
      ...state.templateMeta,
      [templateId]: { ...state.templateMeta[templateId], ...meta },
    },
  };
  const persist = await persistCatalogState(next);
  return { state: next, persist };
}

export function snapshotCatalog(
  state: NetcardCatalogState,
  customTemplates: CustomTemplate[]
): NetcardCatalogSnapshot {
  return {
    types: state.types,
    wallets: state.wallets,
    templates: buildCatalogTemplates(state, customTemplates),
  };
}
