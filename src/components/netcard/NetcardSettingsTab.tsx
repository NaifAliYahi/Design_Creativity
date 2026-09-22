import { useEffect, useMemo, useState } from 'react';
import type { CatalogKindItem, CatalogTemplateItem, TemplateCatalogMeta } from '../../lib/netcard/catalog-types';
import type { CatalogPersistResult } from '../../lib/netcard/catalog';
import {
  addCustomTemplateFromDataUrl,
  readFileAsDataUrl,
  removeCustomTemplate,
  validateTemplateFile,
} from '../../lib/netcard/custom-templates';
import type { NetcardCatalogState } from '../../lib/netcard/catalog-types';
import { filterCatalogTemplates } from '../../lib/netcard/catalog';
import { catalogPersistMessage } from '../../lib/netcard/catalog-persist-hint';
import { getApiToken, isServerAvailable } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

type NetcardSettingsTabProps = {
  catalogState: NetcardCatalogState;
  types: CatalogKindItem[];
  wallets: CatalogKindItem[];
  allTemplates: CatalogTemplateItem[];
  onCatalogChange: (state: NetcardCatalogState) => void;
  addKind: (kind: 'type' | 'wallet', name: string) => Promise<CatalogPersistResult>;
  removeKind: (kind: 'type' | 'wallet', id: string) => Promise<CatalogPersistResult>;
  updateTemplateMeta: (id: string, meta: TemplateCatalogMeta) => Promise<CatalogPersistResult>;
  refreshCustomTemplates: () => void;
};

export function NetcardSettingsTab({
  types,
  wallets,
  allTemplates,
  addKind,
  removeKind,
  updateTemplateMeta,
  refreshCustomTemplates,
}: NetcardSettingsTabProps) {
  const navigate = useNavigate();
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  useEffect(() => {
    isServerAvailable().then(setServerReady);
  }, []);

  const ensureServerSave = async (): Promise<boolean> => {
    const up = await isServerAvailable();
    if (!up) {
      alert('السيرفر غير متصل. شغّل: npm run dev من مجلد web');
      return false;
    }
    if (!getApiToken()) {
      alert('يجب تسجيل الدخول على السيرفر لحفظ المحافظ والأنواع للجميع.');
      navigate('/login', { state: { from: '/studio', needServerLogin: true } });
      return false;
    }
    return true;
  };

  const [uploadGroup, setUploadGroup] = useState('');
  const [uploadTypeId, setUploadTypeId] = useState('');
  const [uploadWalletId, setUploadWalletId] = useState('');
  const [uploadPreview, setUploadPreview] = useState<{ name: string; dataUrl: string }[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [newType, setNewType] = useState('');
  const [newWallet, setNewWallet] = useState('');
  const [manageType, setManageType] = useState('');
  const [manageWallet, setManageWallet] = useState('');
  const [manageGroup, setManageGroup] = useState('');
  const [manageSearch, setManageSearch] = useState('');

  const manageGroups = useMemo(() => {
    const names = [...new Set(allTemplates.map((t) => t.groupName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'ar')
    );
    return names;
  }, [allTemplates]);

  const managed = useMemo(
    () =>
      filterCatalogTemplates(
        allTemplates.filter((t) => t.isCustom),
        {
          typeId: manageType || undefined,
          walletId: manageWallet || undefined,
          groupName: manageGroup || undefined,
          query: manageSearch || undefined,
        }
      ),
    [allTemplates, manageType, manageWallet, manageGroup, manageSearch]
  );

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: { name: string; dataUrl: string }[] = [];
    for (const file of [...files].slice(0, 40)) {
      const err = validateTemplateFile(file);
      if (err) continue;
      next.push({ name: file.name, dataUrl: await readFileAsDataUrl(file) });
    }
    setUploadPreview(next);
  };

  const saveUploads = async () => {
    if (!uploadPreview.length) return;
    if (!(await ensureServerSave())) return;
    setUploadBusy(true);
    try {
      const group = uploadGroup.trim() || 'تصاميم مرفوعة';
      for (const item of uploadPreview) {
        const label = item.name.replace(/\.[^.]+$/, '') || 'قالب';
        const entry = await addCustomTemplateFromDataUrl(label, item.dataUrl, {
          typeId: uploadTypeId || null,
          walletId: uploadWalletId || null,
          groupName: group,
        });
        await updateTemplateMeta(entry.id, {
          name: label,
          typeId: uploadTypeId || null,
          walletId: uploadWalletId || null,
          groupName: group,
        });
      }
      const n = uploadPreview.length;
      setUploadPreview([]);
      refreshCustomTemplates();
      alert(`تم حفظ ${n} قالب`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div className="netcard-panel active netcard-settings-panel">
      {serverReady === false && (
        <p className="netcard-hint" style={{ color: '#b45309', fontWeight: 700 }}>
          ⚠ السيرفر غير متصل — التعديلات لن تصل للعملاء. شغّل npm run dev
        </p>
      )}
      {serverReady && !getApiToken() && (
        <p className="netcard-hint" style={{ color: '#b45309', fontWeight: 700 }}>
          ⚠ سجّل دخولك من /login لحفظ المحافظ والأنواع في قاعدة SQLite للجميع
        </p>
      )}
      <section className="netcard-section">
        <p className="netcard-section-title">① إضافة قوالب جديدة</p>
        <div className="netcard-settings-grid">
          <label>
            <span>اسم المجموعة</span>
            <input
              value={uploadGroup}
              onChange={(e) => setUploadGroup(e.target.value)}
              placeholder="مثال: تصاميم الجمعة شهر 5"
            />
          </label>
          <label>
            <span>نوع القالب</span>
            <select value={uploadTypeId} onChange={(e) => setUploadTypeId(e.target.value)}>
              <option value="">كل الأنواع</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>المحفظة</span>
            <select value={uploadWalletId} onChange={(e) => setUploadWalletId(e.target.value)}>
              <option value="">كل المحافظ</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="netcard-settings-upload">
          <strong>رفع من 1 إلى 40 قالباً (PNG / JPG / WEBP)</strong>
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => onFiles(e.target.files)} />
        </label>
        {uploadPreview.length > 0 && (
          <p className="netcard-hint">{uploadPreview.length} ملف جاهز للحفظ</p>
        )}
        <button type="button" className="netcard-btn primary" disabled={!uploadPreview.length || uploadBusy} onClick={saveUploads}>
          {uploadBusy ? 'جاري الحفظ…' : 'حفظ القوالب'}
        </button>
      </section>

      <div className="netcard-settings-columns">
        <section className="netcard-section">
          <p className="netcard-section-title">② أنواع القوالب</p>
          <div className="netcard-add-row">
            <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="نوع جديد" />
            <button
              type="button"
              className="netcard-btn"
              onClick={async () => {
                if (!(await ensureServerSave())) return;
                const r = await addKind('type', newType);
                if (r === 'server') {
                  setNewType('');
                } else {
                  alert(catalogPersistMessage(r) ?? 'تعذر الحفظ على السيرفر');
                }
              }}
            >
              إضافة
            </button>
          </div>
          <div className="netcard-chip-list">
            {types.map((t) => (
              <span key={t.id} className="netcard-chip">
                {t.name}
                <button type="button" aria-label="حذف" onClick={() => removeKind('type', t.id).catch((e) => alert(e.message))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
        <section className="netcard-section">
          <p className="netcard-section-title">③ المحافظ</p>
          <div className="netcard-add-row">
            <input value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder="محفظة جديدة" />
            <button
              type="button"
              className="netcard-btn"
              onClick={async () => {
                if (!(await ensureServerSave())) return;
                const r = await addKind('wallet', newWallet);
                if (r === 'server') setNewWallet('');
                else alert(catalogPersistMessage(r) ?? 'تعذر الحفظ على السيرفر');
              }}
            >
              إضافة
            </button>
          </div>
          <div className="netcard-chip-list">
            {wallets.map((w) => (
              <span key={w.id} className="netcard-chip">
                {w.name}
                <button type="button" aria-label="حذف" onClick={() => removeKind('wallet', w.id).catch((e) => alert(e.message))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="netcard-section">
        <p className="netcard-section-title">
          ④ إدارة القوالب المرفوعة <span className="netcard-badge">{managed.length}</span>
        </p>
        <div className="netcard-filter-row netcard-filter-row-4">
          <label>
            <span>نوع القالب</span>
            <select value={manageType} onChange={(e) => setManageType(e.target.value)}>
              <option value="">كل الأنواع</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>المحفظة</span>
            <select value={manageWallet} onChange={(e) => setManageWallet(e.target.value)}>
              <option value="">كل المحافظ</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>المجموعة</span>
            <select value={manageGroup} onChange={(e) => setManageGroup(e.target.value)}>
              <option value="">كل المجموعات</option>
              {manageGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>بحث</span>
            <input type="search" value={manageSearch} onChange={(e) => setManageSearch(e.target.value)} placeholder="ابحث عن قالب…" />
          </label>
        </div>
        <div className="netcard-manage-grid">
          {managed.map((t) => (
            <div key={t.id} className="netcard-manage-card">
              <strong>{t.name}</strong>
              <small>{[t.typeName, t.walletName, t.groupName].filter(Boolean).join(' · ')}</small>
              <button
                type="button"
                className="netcard-btn danger"
                onClick={async () => {
                  if (!confirm('حذف هذا القالب؟')) return;
                  await removeCustomTemplate(t.id);
                  refreshCustomTemplates();
                }}
              >
                حذف
              </button>
            </div>
          ))}
          {!managed.length && <p className="netcard-hint">لا توجد قوالب مرفوعة مطابقة للفلتر.</p>}
        </div>
      </section>
    </div>
  );
}
