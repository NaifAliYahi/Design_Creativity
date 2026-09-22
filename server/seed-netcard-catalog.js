import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getJson, setJson } from './sqlite-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULTS_FILE = path.join(__dirname, '..', 'public', 'netcard', 'catalog-defaults.json');

function normalizeWallet(item) {
  if (!item?.id) return item;
  if (item.id === 'wallet-dewali' || item.name?.includes('دوالي')) {
    return { ...item, id: 'wallet-jawali', name: 'محفظة جوالي', code: 'jawali' };
  }
  return item;
}

function mergeById(baseList, extraList) {
  const map = new Map();
  for (const item of baseList || []) {
    const w = normalizeWallet(item);
    if (w?.id) map.set(w.id, w);
  }
  for (const item of extraList || []) {
    const w = normalizeWallet(item);
    if (w?.id) map.set(w.id, w);
  }
  map.delete('wallet-dewali');
  return [...map.values()];
}

/** دمج defaults + SQLite — المحافظ/الأنواع دائماً متاحة لكل المتصفحات */
export function ensureNetcardCatalogSeeded() {
  let defaults = { types: [], wallets: [], templates: {} };
  try {
    const raw = fs.readFileSync(DEFAULTS_FILE, 'utf8').replace(/^\uFEFF/, '');
    defaults = JSON.parse(raw);
  } catch (e) {
    console.warn('[netcard] تعذر قراءة catalog-defaults.json:', e.message);
  }

  const stored =
    getJson('netcardCatalog') ??
    ({
      types: [],
      wallets: [],
      templateMeta: {},
    });

  const next = {
    types: mergeById(defaults.types, stored.types),
    wallets: mergeById(defaults.wallets, stored.wallets),
    templateMeta: { ...(defaults.templates || {}), ...(stored.templateMeta || {}) },
    updatedAt: Date.now(),
    seededFrom: 'catalog-defaults.json',
  };

  setJson('netcardCatalog', next);
  return next;
}
