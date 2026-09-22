import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CustomerPicker } from '../components/CustomerPicker';
import { TemplateScrollPreview } from '../components/TemplateScrollPreview';
import { Button } from '../components/ui';
import { useNetCardDesigner } from '../hooks/useNetCardDesigner';
import { loadAllTemplateThumbs, loadTemplateImage, preloadTemplates } from '../lib/netcard/templates';
import {
  addCustomTemplate,
  addCustomTemplateFromDataUrl,
  loadCustomTemplates,
  readFileAsDataUrl,
  removeCustomTemplate,
  validateTemplateFile,
} from '../lib/netcard/custom-templates';
import {
  BUILTIN_TEMPLATES,
  BUILTIN_TEMPLATE_COUNT,
  FONT_OPTIONS,
  TEMPLATE_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
} from '../lib/netcard/constants';
import { exportAllRowsAllTemplates, exportTemplatesBatch } from '../lib/netcard/canvas-export';
import {
  applyAllTextLayersToAllTemplates,
  applyTextLayerToAllTemplates,
  resetAllTemplateLayouts,
  resetTemplateLayout,
} from '../lib/netcard/template-layout';
import type { Customer } from '../types';
import { downloadNetcardExcelTemplate, parseNetcardExcel } from '../lib/netcard/excel';
import type { CustomTemplate, LayerType, NetworkFields, TemplatePreview, TemplateThumb } from '../lib/netcard/types';
import { layerListLabel } from '../lib/netcard/extra-code-layers';
import type { NetcardThemeId } from '../lib/netcard/catalog-types';
import { NetcardThemeBar } from '../components/netcard/NetcardThemeBar';
import { NetcardSettingsTab } from '../components/netcard/NetcardSettingsTab';
import { useNetcardCatalog } from '../hooks/useNetcardCatalog';
import { buildCardShareMessage, isValidWhatsAppPhone, shareCardViaWhatsApp } from '../lib/share';
import './design-template.css';

type Tab = 'templates' | 'design' | 'settings';
type LayoutMode = 'single' | 'selected' | 'all';

const DEMO_FIELDS: NetworkFields = { name: 'شبكة النور', code: '22540', phone: '0551234567' };

type DesignTemplatePageProps = {
  /** وضع الزائر — بدون اختيار عميل من قاعدة البيانات */
  guestMode?: boolean;
};

export function DesignTemplatePage({ guestMode = false }: DesignTemplatePageProps) {
  const { data } = useApp();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('templates');
  const [thumbs, setThumbs] = useState<TemplateThumb[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [fields, setFields] = useState({ name: '', code: '', phone: '' });
  const [excelRows, setExcelRows] = useState<NetworkFields[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadingCustom, setUploadingCustom] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [batchExporting, setBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');
  const [extraCodes, setExtraCodes] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');
  const [theme, setTheme] = useState<NetcardThemeId>(() => {
    try {
      const s = localStorage.getItem('nc-theme');
      if (s === 'brand' || s === 'odoo' || s === 'teal' || s === 'navy') return s;
    } catch {
      /* ignore */
    }
    return 'brand';
  });
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportPreviewSrc, setExportPreviewSrc] = useState<string | null>(null);
  const reloadTemplateRef = useRef<() => Promise<void>>(async () => {});
  const builtinIds = useMemo(() => BUILTIN_TEMPLATES.map((t) => t.id), []);
  const selectedList = useMemo(() => [...selectedIds], [selectedIds]);
  const customIds = useMemo(() => customTemplates.map((t) => t.id), [customTemplates]);
  const allTemplateIds = useMemo(() => [...builtinIds, ...customIds], [builtinIds, customIds]);

  const hasFields = Boolean(fields.name.trim() && fields.code.trim() && fields.phone.trim());
  const designFields = useMemo(
    () => ({
      ...(hasFields ? fields : guestMode ? fields : DEMO_FIELDS),
      extraCodes,
    }),
    [fields, hasFields, guestMode, extraCodes]
  );

  const getSyncTargetIds = (): string[] => {
    if (layoutMode === 'all') return allTemplateIds;
    if (layoutMode === 'selected') return selectedList;
    return [];
  };

  const getExportTargetIds = (): string[] =>
    selectedList.length > 0 ? selectedList : allTemplateIds;

  const toggleTemplateSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllTemplates = () => setSelectedIds(new Set(allTemplateIds));
  const clearTemplateSelection = () => setSelectedIds(new Set());

  const designer = useNetCardDesigner(designFields, { guestMode });
  const catalog = useNetcardCatalog(customTemplates);

  useEffect(() => {
    try {
      localStorage.setItem('nc-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    if (session) catalog.reload();
  }, [session?.userId]);

  reloadTemplateRef.current = designer.reloadCurrentTemplate;

  const refreshCustomTemplates = () => {
    loadCustomTemplates().then(setCustomTemplates);
  };

  useEffect(() => {
    preloadTemplates();
    loadAllTemplateThumbs()
      .then(setThumbs)
      .finally(() => setThumbsLoading(false));
    refreshCustomTemplates();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setFields({
        name: selectedCustomer.networkName,
        code: selectedCustomer.code,
        phone: selectedCustomer.phone,
      });
    }
  }, [selectedCustomer]);

  const thumbMap = useMemo(() => new Map(thumbs.map((t) => [t.name, t.thumb])), [thumbs]);

  const pickTemplate = async (name: string, srcOverride?: string) => {
    if (designer.templateId === name) {
      setTab('design');
      return;
    }
    if (designer.templateId) {
      await designer.flushSave();
    }
    setPreview(null);
    setTab('design');
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    if (srcOverride) {
      await designer.loadBackgroundFromSrc(name, srcOverride);
    } else {
      await designer.loadBackground(name);
    }
  };

  const openExportPreview = () => {
    if (!hasFields && guestMode) {
      alert('أدخل بيانات الشبكة أولاً');
      return;
    }
    const row = hasFields ? fields : designFields;
    const result = designer.getExportBlob(row);
    if (!result) {
      alert('اختر قالباً وصمّم الليبلات أولاً');
      return;
    }
    if (exportPreviewSrc) URL.revokeObjectURL(exportPreviewSrc);
    setExportPreviewSrc(URL.createObjectURL(result.blob));
  };

  const closeExportPreview = () => {
    if (exportPreviewSrc) URL.revokeObjectURL(exportPreviewSrc);
    setExportPreviewSrc(null);
  };

  const openBuiltInPreview = async (name: string) => {
    setPreviewLoading(true);
    try {
      const src = thumbMap.get(name) || (await loadTemplateImage(name));
      setPreview({ id: name, label: name, src });
    } catch {
      alert('تعذر تحميل معاينة القالب');
    } finally {
      setPreviewLoading(false);
    }
  };

  const openCustomPreview = (tpl: CustomTemplate) => {
    setPreview({ id: tpl.id, label: tpl.label, src: tpl.base64, isCustom: true });
  };

  const usePreviewTemplate = async () => {
    if (!preview) return;
    if (preview.id.startsWith('preview-')) {
      setUploadingCustom(true);
      try {
        const entry = await addCustomTemplateFromDataUrl(preview.label, preview.src);
        refreshCustomTemplates();
        await pickTemplate(entry.id, entry.base64);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'تعذر حفظ القالب');
      } finally {
        setUploadingCustom(false);
      }
      return;
    }
    await pickTemplate(preview.id, preview.isCustom ? preview.src : undefined);
  };

  const handleExternalUpload = async (file: File, previewOnly = false) => {
    const err = validateTemplateFile(file);
    if (err) {
      alert(err);
      return;
    }
    if (previewOnly) {
      const src = await readFileAsDataUrl(file);
      const label = file.name.replace(/\.[^.]+$/, '') || 'قالب خارجي';
      setPreview({ id: `preview-${Date.now()}`, label, src, isCustom: true });
      return;
    }
    setUploadingCustom(true);
    try {
      const entry = await addCustomTemplate(file);
      refreshCustomTemplates();
      setSelectedIds((prev) => new Set(prev).add(entry.id));
      setPreview({ id: entry.id, label: entry.label, src: entry.base64, isCustom: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر رفع القالب');
    } finally {
      setUploadingCustom(false);
    }
  };

  const deleteCustom = async (id: string) => {
    if (!window.confirm('حذف هذا القالب المخصص؟')) return;
    await removeCustomTemplate(id);
    refreshCustomTemplates();
    if (preview?.id === id) setPreview(null);
  };

  const goToTemplates = () => setTab('templates');

  const formatSavedTime = (ts: number | null) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const setField = (key: 'name' | 'code' | 'phone', value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
  };

  const resolveTemplateLabel = (id: string) => {
    const custom = customTemplates.find((t) => t.id === id);
    return custom?.label ?? TEMPLATE_LABELS[id] ?? id;
  };

  const handleExportSelectedTemplates = async () => {
    if (!hasFields) {
      alert('أدخل اسم الشبكة ورقم الكود ورقم الهاتف أولاً');
      return;
    }
    if (selectedList.length === 0) {
      alert('حدّد قالباً واحداً على الأقل من القائمة (☑)');
      return;
    }
    setBatchExporting(true);
    setBatchProgress('');
    try {
      const n = await exportTemplatesBatch(selectedList, fields, {
        guestMode,
        onProgress: (cur, total, id) =>
          setBatchProgress(`جاري ${cur}/${total}: ${resolveTemplateLabel(id)}`),
      });
      if (n === 0) alert('تعذر تصدير القوالب — تأكد من تصميم القوالب المحددة');
      else alert(`تم تنزيل ${n} قالب`);
    } finally {
      setBatchExporting(false);
      setBatchProgress('');
    }
  };

  const handleExportAllTemplates = async () => {
    if (!hasFields) {
      alert('أدخل اسم الشبكة ورقم الكود ورقم الهاتف أولاً');
      return;
    }
    setBatchExporting(true);
    setBatchProgress('');
    try {
      const ids = getExportTargetIds();
      const n = await exportTemplatesBatch(ids, fields, {
        guestMode,
        onProgress: (cur, total, id) =>
          setBatchProgress(`جاري ${cur}/${total}: ${resolveTemplateLabel(id)}`),
      });
      if (n === 0) alert('تعذر تصدير القوالب');
      else alert(`تم تنزيل ${n} قالب بنجاح`);
    } finally {
      setBatchExporting(false);
      setBatchProgress('');
    }
  };

  const handleExportAllRowsAllTemplates = async () => {
    if (!excelRows.length) return;
    const ids = selectedList.length > 0 ? selectedList : allTemplateIds;
    setBatchExporting(true);
    setBatchProgress('');
    try {
      const n = await exportAllRowsAllTemplates(ids, excelRows, { guestMode: false });
      alert(`تم تنزيل ${n} صورة (${excelRows.length} شبكة × ${ids.length} قالب)`);
    } finally {
      setBatchExporting(false);
      setBatchProgress('');
    }
  };

  const handleApplySelectedToAll = async () => {
    if (!designer.selectedLayer || !designer.canvasSize.w) return;
    const ids = getSyncTargetIds();
    if (ids.length === 0) {
      alert(layoutMode === 'selected' ? 'حدّد القوالب من القائمة (☑) أولاً' : 'لا توجد قوالب');
      return;
    }
    setLayoutBusy(true);
    try {
      const n = await applyTextLayerToAllTemplates(
        designer.selectedLayer,
        designer.canvasSize.w,
        designer.canvasSize.h,
        ids
      );
      alert(n > 0 ? `تم تطبيق الليبل على ${n} قالب` : 'تعذر التطبيق');
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleApplyAllLayersToAll = async () => {
    if (!designer.canvasSize.w) return;
    const ids = getSyncTargetIds();
    if (ids.length === 0) {
      alert('حدّد قوالب (☑) أو فعّل «كل القوالب»');
      return;
    }
    const modeLabel = layoutMode === 'all' ? 'كل القوالب' : `${ids.length} قالب محدد`;
    if (!window.confirm(`تطبيق مواقع الاسم والكود والهاتف على ${modeLabel}؟`)) return;
    setLayoutBusy(true);
    try {
      await applyAllTextLayersToAllTemplates(
        designer.layers,
        designer.canvasSize.w,
        designer.canvasSize.h,
        ids
      );
      alert(`تم تطبيق التصميم على ${ids.length} قالب`);
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleResetCurrent = async () => {
    if (!designer.templateId || !window.confirm('إعادة هذا القالب للإعدادات الافتراضية؟')) return;
    setLayoutBusy(true);
    try {
      await resetTemplateLayout(designer.templateId);
      await designer.reloadCurrentTemplate();
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm(`إعادة كل القوالب (${BUILTIN_TEMPLATE_COUNT}) للإعدادات الافتراضية؟`)) return;
    setLayoutBusy(true);
    try {
      const n = await resetAllTemplateLayouts(builtinIds);
      if (designer.templateId) await designer.reloadCurrentTemplate();
      alert(`تمت إعادة ${n} قالب`);
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleWhatsAppShare = async (rowOverride?: NetworkFields) => {
    const phone = rowOverride?.phone ?? fields.phone;
    if (!isValidWhatsAppPhone(phone)) {
      alert('أدخل رقم هاتف صحيح (مثل 0551234567) لمشاركة البطاقة عبر واتساب');
      return;
    }
    const result = designer.getExportBlob(rowOverride);
    if (!result) {
      alert('أضف طبقات على القالب أولاً');
      return;
    }
    setSharing(true);
    try {
      const msg = buildCardShareMessage(result.row.name, result.row.code);
      const mode = await shareCardViaWhatsApp(phone, msg, result.blob, result.filename);
      if (mode === 'whatsapp') {
        alert('تم تنزيل الصورة — أرفقها في واتساب من زر 📎');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        alert(e instanceof Error ? e.message : 'تعذرت المشاركة');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className={`netcard-app nc-studio mx-auto max-w-[1400px] ${guestMode ? 'netcard-guest' : ''}`}
      data-theme={theme}
      dir="rtl"
    >
      <NetcardThemeBar
        theme={theme}
        onChange={setTheme}
        templateCount={catalog.allTemplates.length}
        selectedCount={selectedList.length}
      />

      {guestMode && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm text-brand-900 mx-1">
          <strong>①</strong> أدخل البيانات → <strong>②</strong> فلتر/حدّد القوالب → <strong>③</strong> صمّم →{' '}
          <strong>④</strong> نزّل
        </div>
      )}

      <div className="netcard-shell nc-studio-shell">
        <div className="netcard-tabs">
          <button
            type="button"
            className={`netcard-tab ${tab === 'templates' ? 'active' : ''}`}
            onClick={() => setTab('templates')}
          >
            القوالب المتاحة
          </button>
          <button
            type="button"
            className={`netcard-tab ${tab === 'design' ? 'active' : ''}`}
            onClick={() => (designer.bgLoaded ? setTab('design') : alert('اختر قالباً أولاً'))}
          >
            منطقة التصميم
          </button>
          {!guestMode && (
            <button
              type="button"
              className={`netcard-tab ${tab === 'settings' ? 'active' : ''}`}
              onClick={() => setTab('settings')}
            >
              إعدادات القوالب
            </button>
          )}
        </div>

        {tab === 'templates' && (
          <div className="netcard-panel active">
            <div className="netcard-section">
              <p className="netcard-section-title">① بيانات الشبكة</p>
              {!guestMode && (
                <CustomerPicker
                  customers={data.customers}
                  selected={selectedCustomer}
                  onSelect={setSelectedCustomer}
                  onClear={() => setSelectedCustomer(null)}
                  placeholder="ابحث لملء الاسم والكود والجوال تلقائياً…"
                />
              )}
              <div className="netcard-input-row">
                <label>
                  <span>اسم الشبكة</span>
                  <input value={fields.name} onChange={(e) => setField('name', e.target.value)} placeholder="شبكة النور" />
                </label>
                <label>
                  <span>رقم الكود</span>
                  <input value={fields.code} onChange={(e) => setField('code', e.target.value)} placeholder="22540" className="font-mono" />
                </label>
                <label>
                  <span>رقم الهاتف</span>
                  <input value={fields.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="05XXXXXXXX" className="font-mono" />
                </label>
              </div>
              <div className="netcard-extra-codes">
                <div className="netcard-extra-codes-head">
                  <span>كود آخر أو نص يظهر على التصميم</span>
                  <button
                    type="button"
                    className="netcard-link-btn"
                    disabled={extraCodes.length >= 19}
                    onClick={() => setExtraCodes((prev) => [...prev, ''])}
                  >
                    + إضافة نص أو كود
                  </button>
                </div>
                {extraCodes.map((val, idx) => (
                  <label key={idx} className="netcard-extra-code-row">
                    <span>إضافي {idx + 1}</span>
                    <input
                      value={val}
                      placeholder="نص أو كود إضافي"
                      onChange={(e) =>
                        setExtraCodes((prev) => prev.map((c, i) => (i === idx ? e.target.value : c)))
                      }
                    />
                    <button
                      type="button"
                      className="netcard-link-btn danger"
                      onClick={() => setExtraCodes((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      حذف
                    </button>
                  </label>
                ))}
              </div>
              <div className="netcard-btn-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="netcard-btn primary"
                  onClick={handleExportSelectedTemplates}
                  disabled={!hasFields || batchExporting || selectedList.length === 0}
                >
                  {batchExporting
                    ? '⏳ جاري التصدير…'
                    : `📥 تنزيل المحددة (${selectedList.length || 0})`}
                </button>
                {!guestMode && (
                  <>
                    <button
                      type="button"
                      className="netcard-btn"
                      onClick={handleExportAllTemplates}
                      disabled={!hasFields || batchExporting}
                    >
                      📥 تنزيل الكل ({BUILTIN_TEMPLATE_COUNT})
                    </button>
                    <button type="button" className="netcard-btn" onClick={downloadNetcardExcelTemplate}>
                      📥 نموذج Excel
                    </button>
                    <label className="netcard-file-btn">
                      📊 استيراد Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        hidden
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const buf = await f.arrayBuffer();
                          const rows = parseNetcardExcel(buf);
                          setExcelRows(rows);
                          if (rows[0]) setFields(rows[0]);
                          alert(`تم استيراد ${rows.length} صف`);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {excelRows.length > 0 && (
                      <button
                        type="button"
                        className="netcard-btn"
                        onClick={handleExportAllRowsAllTemplates}
                        disabled={batchExporting}
                      >
                        📥 Excel × {selectedList.length || builtinIds.length} قالب
                      </button>
                    )}
                  </>
                )}
              </div>
              {batchProgress && <p className="netcard-hint" style={{ marginTop: 8, color: '#0f766e' }}>{batchProgress}</p>}
              <TemplateScrollPreview
                fields={designFields}
                templateIds={selectedList.length > 0 ? selectedList : []}
                activeId={designer.templateId}
                onSelect={(id) => pickTemplate(id)}
                enabled={guestMode ? hasFields && selectedList.length > 0 : selectedList.length > 0 || hasFields}
              />
              <p className="netcard-hint" style={{ marginTop: 8 }}>
                {guestMode
                  ? 'حدّد القوالب (☑) → أدخل البيانات → من «منطقة التصميم» اسحب الليبلات وعدّلها → نزّل.'
                  : 'حدّد قوالب (☑) → صمّم من «منطقة التصميم» → نزّل للعميل. وضع «القوالب المحددة» يطبّق التعديل على المحدد فقط.'}
              </p>
            </div>

            <div className="netcard-section">
              <p className="netcard-section-title">② اختر وحدّد القوالب (☑)</p>
              <div className="netcard-filter-row netcard-filter-row-4">
                <label>
                  <span>نوع القالب</span>
                  <select value={catalog.typeFilter} onChange={(e) => catalog.setTypeFilter(e.target.value)}>
                    <option value="">كل الأنواع</option>
                    {catalog.types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>المحفظة</span>
                  <select value={catalog.walletFilter} onChange={(e) => catalog.setWalletFilter(e.target.value)}>
                    <option value="">كل المحافظ</option>
                    {catalog.wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>المجموعة</span>
                  <select value={catalog.groupFilter} onChange={(e) => catalog.setGroupFilter(e.target.value)}>
                    <option value="">كل المجموعات</option>
                    {catalog.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>بحث</span>
                  <input
                    type="search"
                    value={catalog.templateQuery}
                    onChange={(e) => catalog.setTemplateQuery(e.target.value)}
                    placeholder="اسم القالب أو الملف…"
                  />
                </label>
              </div>
              <div className="netcard-btn-row" style={{ marginBottom: 12 }}>
                <button type="button" className="netcard-btn" onClick={selectAllTemplates}>
                  ☑ تحديد الكل
                </button>
                <button type="button" className="netcard-btn" onClick={clearTemplateSelection}>
                  ☐ إلغاء التحديد
                </button>
                <span className="netcard-hint" style={{ margin: 0, alignSelf: 'center' }}>
                  {selectedList.length} / {allTemplateIds.length} محدد
                </span>
              </div>
              <div className="netcard-btn-row" style={{ marginBottom: 12 }}>
                <label className="netcard-file-btn">
                  📁 {guestMode ? 'استيراد تصميم (PNG/JPG)' : 'رفع قالب خارجي (PNG/JPG)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    hidden
                    disabled={uploadingCustom}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleExternalUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <label className="netcard-file-btn">
                  👁 {guestMode ? 'معاينة قبل الاستيراد' : 'استعراض صورة خارجية'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleExternalUpload(f, true);
                      e.target.value = '';
                    }}
                  />
                </label>
                {uploadingCustom && (
                  <span className="netcard-hint" style={{ margin: 0, alignSelf: 'center' }}>
                    جاري استيراد التصميم…
                  </span>
                )}
              </div>
              <p className="netcard-hint" style={{ marginBottom: 12 }}>
                {guestMode ? (
                  <>
                    اختر قالب محفظة جيب أو ارفع تصميمك. اضغط <strong>👁</strong> للمعاينة قبل الاختيار.
                    {designer.templateId && (
                      <>
                        {' '}
                        القالب النشط: <strong>{designer.templateId}</strong>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    كل قالب له تصميم مستقل — عند وضع الليبلات يُحفظ تلقائياً في قاعدة البيانات.
                    اضغط <strong>👁</strong> لاستعراض القالب قبل الاختيار، أو ارفع قالباً خارجياً للتصميم عليه.
                    {designer.templateId && (
                      <>
                        {' '}
                        القالب النشط حالياً: <strong>{designer.templateId}</strong>
                      </>
                    )}
                  </>
                )}
              </p>
              {thumbsLoading ? (
                <p className="netcard-hint">جاري تحميل القوالب…</p>
              ) : (
                <div className="netcard-gallery">
                  {catalog.filteredBuiltin.map((item) => {
                    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === item.id);
                    const name = item.id;
                    const thumb = thumbMap.get(name);
                    const label = item.name;
                    return (
                      <div
                        key={name}
                        className={`netcard-tpl ${item.featured || tpl?.featured ? 'featured' : ''} ${designer.templateId === name ? 'selected' : ''} ${selectedIds.has(name) ? 'checked' : ''}`}
                      >
                        <label
                          className="netcard-tpl-check"
                          title="تحديد للتنزيل"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(name)}
                            onChange={() => toggleTemplateSelect(name)}
                          />
                        </label>
                        <button type="button" className="netcard-tpl-main" onClick={() => pickTemplate(name)}>
                          {thumb ? (
                            <img src={thumb} alt={label} loading="lazy" />
                          ) : (
                            <div className="netcard-tpl-ph">{label}</div>
                          )}
                          <span>
                            {item.featured || tpl?.featured ? '⭐ ' : ''}
                            {label}
                            {(designer.savedSummary[name] ?? 0) > 0 && (
                              <span className="netcard-saved-dot" title="تصميم محفوظ">
                                {' '}
                                ✓
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="netcard-tpl-preview-btn"
                          title="استعراض القالب"
                          onClick={() => openBuiltInPreview(name)}
                        >
                          👁
                        </button>
                      </div>
                    );
                  })}
                  {catalog.filteredCustom.map((item) => {
                    const tpl = customTemplates.find((c) => c.id === item.id);
                    if (!tpl) return null;
                    return (
                    <div
                      key={tpl.id}
                      className={`netcard-tpl custom ${designer.templateId === tpl.id ? 'selected' : ''} ${selectedIds.has(tpl.id) ? 'checked' : ''}`}
                    >
                      <label
                        className="netcard-tpl-check"
                        title="تحديد للتنزيل"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tpl.id)}
                          onChange={() => toggleTemplateSelect(tpl.id)}
                        />
                      </label>
                      <button type="button" className="netcard-tpl-main" onClick={() => pickTemplate(tpl.id, tpl.base64)}>
                        <img src={tpl.thumb} alt={tpl.label} loading="lazy" />
                        <span>
                          📁 {tpl.label}
                          {(designer.savedSummary[tpl.id] ?? 0) > 0 && (
                            <span className="netcard-saved-dot" title="تصميم محفوظ">
                              {' '}
                              ✓
                            </span>
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="netcard-tpl-preview-btn"
                        title="استعراض القالب"
                        onClick={() => openCustomPreview(tpl)}
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        className="netcard-tpl-delete-btn"
                        title="حذف القالب"
                        onClick={() => deleteCustom(tpl.id)}
                      >
                        ×
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {exportPreviewSrc && (
          <div className="netcard-preview-overlay" onClick={closeExportPreview}>
            <div className="netcard-preview-modal netcard-export-preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="netcard-preview-modal-head">
                <h3>
                  معاينة التصدير — {designer.templateId ? resolveTemplateLabel(designer.templateId) : ''}
                </h3>
                <button type="button" className="netcard-preview-close" onClick={closeExportPreview}>
                  ×
                </button>
              </div>
              <p className="netcard-hint" style={{ padding: '0 16px 8px' }}>
                هكذا ستظهر الصورة عند التنزيل — كل قالب له تصميمه المستقل
              </p>
              <div className="netcard-preview-modal-body">
                <img src={exportPreviewSrc} alt="معاينة التصدير" />
              </div>
              <div className="netcard-preview-modal-actions">
                <button
                  type="button"
                  className="netcard-btn primary"
                  onClick={() => {
                    designer.exportImage(hasFields ? fields : designFields);
                  }}
                >
                  📥 تنزيل هذا القالب
                </button>
                <button type="button" className="netcard-btn" onClick={closeExportPreview}>
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {preview && (
          <div className="netcard-preview-overlay" onClick={() => setPreview(null)}>
            <div className="netcard-preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="netcard-preview-modal-head">
                <h3>معاينة: {preview.label}</h3>
                <button type="button" className="netcard-preview-close" onClick={() => setPreview(null)}>
                  ×
                </button>
              </div>
              <div className="netcard-preview-modal-body">
                <img src={preview.src} alt={preview.label} />
              </div>
              <div className="netcard-preview-modal-actions">
                <button type="button" className="netcard-btn primary" onClick={usePreviewTemplate}>
                  ✓ استخدام للتصميم
                </button>
                <button type="button" className="netcard-btn" onClick={() => setPreview(null)}>
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {previewLoading && (
          <div className="netcard-preview-overlay">
            <p className="netcard-preview-loading">جاري تحميل المعاينة…</p>
          </div>
        )}

        {tab === 'design' && (
          <div className="netcard-panel active">
            <div className="netcard-section">
              <p className="netcard-section-title">
                {guestMode ? 'بيانات الشبكة (تُطبّق على القالب)' : '① بيانات الشبكة (اختياري — من البحث)'}
              </p>
              {!guestMode && (
                <CustomerPicker
                  customers={data.customers}
                  selected={selectedCustomer}
                  onSelect={setSelectedCustomer}
                  onClear={() => setSelectedCustomer(null)}
                  placeholder="ابحث لملء الاسم والكود والجوال تلقائياً…"
                />
              )}
              <div className="netcard-input-row">
                <label>
                  <span>اسم الشبكة</span>
                  <input value={fields.name} onChange={(e) => setField('name', e.target.value)} placeholder="شبكة النور" />
                </label>
                <label>
                  <span>رقم الكود</span>
                  <input value={fields.code} onChange={(e) => setField('code', e.target.value)} placeholder="22540" className="font-mono" />
                </label>
                <label>
                  <span>رقم الهاتف</span>
                  <input value={fields.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="05XXXXXXXX" className="font-mono" />
                </label>
              </div>
              {!guestMode && !hasFields && (
                <p className="netcard-hint" style={{ marginTop: 8 }}>
                  معاينة التصميم ببيانات تجريبية — أدخل بيانات العميل قبل التنزيل
                </p>
              )}
              {!guestMode && excelRows.length > 0 && (
                <p className="netcard-hint" style={{ marginTop: 8 }}>
                  Excel: {excelRows.length} صف — الصف الأول: {excelRows[0]?.name}
                </p>
              )}
              {!guestMode && (
                <div className="netcard-btn-row" style={{ marginTop: 12, marginBottom: 8 }}>
                  <button type="button" className="netcard-btn" onClick={selectAllTemplates}>
                    ☑ تحديد الكل
                  </button>
                  <button type="button" className="netcard-btn" onClick={clearTemplateSelection}>
                    ☐ إلغاء التحديد
                  </button>
                  <span className="netcard-hint" style={{ margin: 0, alignSelf: 'center' }}>
                    {selectedList.length} / {allTemplateIds.length} محدد للتعديل والتنزيل
                  </span>
                </div>
              )}
              <TemplateScrollPreview
                fields={designFields}
                templateIds={selectedList.length > 0 ? selectedList : guestMode ? [] : builtinIds}
                activeId={designer.templateId}
                onSelect={(id) => pickTemplate(id)}
                enabled={guestMode ? hasFields && selectedList.length > 0 : true}
              />
            </div>

            <div className="netcard-section">
              <div className="netcard-design-head">
                <p className="netcard-section-title" style={{ marginBottom: 0 }}>
                  ② منطقة التصميم
                  {designer.templateId && (
                    <span className="netcard-badge">قالب: {designer.templateId}</span>
                  )}
                </p>
                <div className="netcard-design-head-actions">
                  <button type="button" className="netcard-btn" onClick={goToTemplates}>
                    🔄 تغيير القالب
                  </button>
                  {designer.lastSavedAt && (
                    <span className="netcard-save-status" title="يُحفظ تلقائياً عند كل تعديل">
                      💾 محفوظ {formatSavedTime(designer.lastSavedAt)}
                    </span>
                  )}
                </div>
              </div>

              {!guestMode && (
                <div className="netcard-layout-bar">
                  <span className="netcard-layout-label">وضع التعديل:</span>
                  <button
                    type="button"
                    className={`netcard-layout-btn ${layoutMode === 'single' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('single')}
                  >
                    قالب واحد (مستقل)
                  </button>
                  <button
                    type="button"
                    className={`netcard-layout-btn ${layoutMode === 'selected' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('selected')}
                  >
                    نسخ → المحددة ({selectedList.length})
                  </button>
                  <button
                    type="button"
                    className={`netcard-layout-btn ${layoutMode === 'all' ? 'active' : ''}`}
                    onClick={() => setLayoutMode('all')}
                  >
                    نسخ → الكل ({allTemplateIds.length})
                  </button>
                </div>
              )}

              {guestMode && (
                <p className="netcard-hint netcard-layout-hint">
                  ✓ اسحب الليبلات على القالب — التعديل يُحفظ تلقائياً في متصفحك لكل قالب
                </p>
              )}

              {!guestMode && (
                <p className="netcard-hint netcard-layout-hint">
                  {layoutMode === 'single'
                    ? '✓ كل قالب يحفظ مواقعه الخاصة — عدّل ثم انتقل لقالب آخر دون فقدان التصميم'
                    : '⚠ التعديل يُحفظ للقالب الحالي فقط — اضغط «طبّق» لنسخ المواقع للقوالب الأخرى'}
                </p>
              )}

              <div className="netcard-btn-row">
                {(['name', 'code', 'phone'] as LayerType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`netcard-btn ${designer.selectedLayer?.type === type ? 'primary' : ''}`}
                    style={
                      designer.selectedLayer?.type === type
                        ? undefined
                        : { borderColor: TYPE_COLORS[type], color: TYPE_COLORS[type] }
                    }
                    onClick={() => designer.selectLayerByType(type)}
                    disabled={!designer.bgLoaded}
                  >
                    ✥ {TYPE_LABELS[type]}
                  </button>
                ))}
                {!guestMode && (layoutMode === 'selected' || layoutMode === 'all') && (
                  <button
                    type="button"
                    className="netcard-btn"
                    onClick={handleApplySelectedToAll}
                    disabled={!designer.selectedLayer || layoutBusy || getSyncTargetIds().length === 0}
                  >
                    ⬆ طبّق الليبل الحالي
                  </button>
                )}
                {!guestMode && (
                  <>
                    <button
                      type="button"
                      className="netcard-btn"
                      onClick={handleApplyAllLayersToAll}
                      disabled={!designer.bgLoaded || layoutBusy || getSyncTargetIds().length === 0}
                    >
                      ⬆ طبّق الثلاثة ({layoutMode === 'all' ? allTemplateIds.length : selectedList.length || '—'})
                    </button>
                    <button type="button" className="netcard-btn danger" onClick={handleResetAll} disabled={layoutBusy}>
                      ↺ إعادة الكل
                    </button>
                  </>
                )}
                <button type="button" className="netcard-btn danger" onClick={handleResetCurrent} disabled={layoutBusy}>
                  ↺ إعادة القالب
                </button>
                <button
                  type="button"
                  className="netcard-btn"
                  disabled={!designer.bgLoaded || designer.loading}
                  onClick={async () => {
                    const ok = await designer.detectSlots();
                    alert(
                      ok
                        ? guestMode
                          ? 'تم التعرف على المناطق الثلاث. عدّلها ثم نزّل — يُحفظ في متصفحك فقط.'
                          : 'تم التعرف على مناطق الاسم والكود والهاتف. راجع المواقع ثم احفظ إن لزم.'
                        : 'تعذّر التعرف — جرّب سحب الليبلات يدوياً أو قالباً أوضح.'
                    );
                  }}
                >
                  ◎ تعرف على المناطق الثلاث
                </button>
              </div>

              <div className="netcard-btn-row">
                {!guestMode && (
                  <label className="netcard-file-btn">
                    + صورة
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={!designer.bgLoaded}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) designer.addImageLayer(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
                {!guestMode && (
                  <>
                    <button type="button" className="netcard-btn danger" onClick={designer.deleteLayer} disabled={!designer.selectedId}>
                      حذف الطبقة
                    </button>
                  </>
                )}
                <button type="button" className="netcard-btn" onClick={designer.undo}>
                  ↩ تراجع
                </button>
                <button
                  type="button"
                  className={`netcard-btn ${designer.previewMode ? 'primary' : ''}`}
                  onClick={() => designer.setPreviewMode(!designer.previewMode)}
                  disabled={!designer.bgLoaded}
                >
                  {designer.previewMode ? '⏹ إيقاف المعاينة' : '👁 معاينة على القالب'}
                </button>
                <button
                  type="button"
                  className="netcard-btn"
                  onClick={openExportPreview}
                  disabled={!designer.bgLoaded || designer.layers.length === 0}
                >
                  🔍 معاينة قبل التصدير
                </button>
              </div>

              {designer.previewMode && (
                <div className="netcard-preview-banner">
                  <strong>وضع المعاينة:</strong>{' '}
                  {excelRows.length > 0
                    ? `Excel — الصف الأول: ${excelRows[0].name} | ${excelRows[0].code} | ${excelRows[0].phone}`
                    : 'بالبيانات المدخلة (كما ستظهر عند التصدير)'}
                </div>
              )}

              <p className="netcard-hint" style={{ margin: '8px 0' }}>
                {guestMode
                  ? 'انقر ✥ لتحديد ليبل · اسحبه · غيّر الحجم من الزوايا · عدّل اللون والخط من الجانب'
                  : layoutMode === 'single'
                    ? 'انقر ✥ لتحديد ليبل · اسحبه · غيّر الحجم من الزوايا · عدّل اللون والخط من الجانب'
                    : layoutMode === 'all'
                      ? `وضع جماعي: التعديل يُطبّق على ${allTemplateIds.length} قالب — اسحب أو غيّر الخط/اللون`
                      : selectedList.length === 0
                        ? 'حدّد قوالب (☑) ثم فعّل «المحددة»'
                        : `وضع جماعي: التعديل يُطبّق على ${selectedList.length} قالب`}
              </p>
              {batchProgress && !guestMode && (
                <p className="netcard-hint" style={{ color: '#0f766e', fontWeight: 700 }}>
                  {batchProgress}
                </p>
              )}

              <div className="netcard-grid-2">
                <div>
                  <div className="netcard-canvas-box" ref={designer.containerRef}>
                    {designer.loading && <p className="netcard-placeholder">جاري تحميل القالب…</p>}
                    {!designer.loading && !designer.bgLoaded && (
                      <p className="netcard-placeholder">← ارجع واختر قالباً</p>
                    )}
                    <canvas
                      ref={designer.canvasRef}
                      style={{ display: designer.bgLoaded ? 'block' : 'none' }}
                      onPointerDown={designer.onPointerDown}
                      onPointerMove={designer.onPointerMove}
                      onPointerUp={designer.onPointerUp}
                      onPointerLeave={designer.onPointerUp}
                    />
                    {designer.bgLoaded && designer.canvasSize.w > 0 && (
                      <p className="netcard-canvas-size">
                        {designer.canvasSize.w} × {designer.canvasSize.h} px
                      </p>
                    )}
                  </div>
                  <div className="netcard-export-row">
                    <button
                      type="button"
                      className="netcard-export-btn"
                      onClick={() => designer.exportImage()}
                      disabled={!designer.bgLoaded || designer.layers.length === 0 || !hasFields}
                    >
                      📥 هذا القالب
                    </button>
                    {!guestMode && (
                      <>
                        <button
                          type="button"
                          className="netcard-export-btn netcard-export-all"
                          onClick={handleExportSelectedTemplates}
                          disabled={!hasFields || batchExporting || selectedList.length === 0}
                        >
                          {batchExporting
                            ? '⏳…'
                            : `📥 المحددة (${selectedList.length})`}
                        </button>
                        <button
                          type="button"
                          className="netcard-export-btn netcard-export-all"
                          onClick={handleExportAllTemplates}
                          disabled={!hasFields || batchExporting}
                        >
                          {batchExporting ? '⏳…' : `📥 الكل (${allTemplateIds.length})`}
                        </button>
                      </>
                    )}
                    {guestMode && (
                      <button
                        type="button"
                        className="netcard-export-btn netcard-export-all"
                        onClick={handleExportSelectedTemplates}
                        disabled={!hasFields || batchExporting || selectedList.length === 0}
                      >
                        {batchExporting
                          ? '⏳ جاري التصدير…'
                          : `📥 تنزيل المحددة (${selectedList.length})`}
                      </button>
                    )}
                    <button
                      type="button"
                      className="netcard-export-btn netcard-wa-btn"
                      onClick={() => handleWhatsAppShare()}
                      disabled={!designer.bgLoaded || designer.layers.length === 0 || sharing || !hasFields}
                    >
                      {sharing ? '⏳…' : '💬 واتساب'}
                    </button>
                  </div>
                  {batchProgress && (
                    <p className="netcard-hint" style={{ marginTop: 8, color: '#0f766e', fontWeight: 700 }}>
                      {batchProgress}
                    </p>
                  )}
                  {excelRows.length > 0 && !guestMode && (
                    <button
                      type="button"
                      className="netcard-export-btn netcard-export-all"
                      style={{ marginTop: 8 }}
                      onClick={() => designer.exportAll(excelRows)}
                      disabled={!designer.bgLoaded || designer.layers.length === 0}
                    >
                      📥 Excel — هذا القالب ({excelRows.length} صف)
                    </button>
                  )}
                </div>

                <div className="netcard-sidebar">
                  <div className="netcard-section" style={{ marginBottom: 0 }}>
                    <p className="netcard-section-title">الطبقات</p>
                    <div className="netcard-layer-list">
                      {[...designer.layers].reverse().map((layer) => (
                        <div
                          key={layer.id}
                          className={`netcard-layer-item ${layer.id === designer.selectedId ? 'selected' : ''} ${!layer.visible ? 'hidden-layer' : ''}`}
                          onClick={() => designer.setSelectedId(layer.id)}
                        >
                          <input
                            type="checkbox"
                            checked={layer.visible}
                            onChange={(e) => {
                              e.stopPropagation();
                              designer.toggleVisible(layer.id);
                            }}
                          />
                          <span style={{ flex: 1 }}>
                            {layerListLabel(layer, extraCodes)}
                          </span>
                        </div>
                      ))}
                      {designer.layers.length === 0 && (
                        <p className="netcard-hint">اضغط ✥ لتحديد ليبل · اسحبه على القالب</p>
                      )}
                    </div>
                  </div>

                  {designer.selectedLayer && designer.selectedLayer.type !== 'image' && (
                    <div className="netcard-section">
                      <p className="netcard-section-title">
                        خصائص {TYPE_LABELS[designer.selectedLayer.type as LayerType]}
                      </p>
                      <div className="netcard-props">
                        <label>
                          <span>حجم الخط</span>
                          <input
                            type="number"
                            min={8}
                            max={300}
                            value={designer.selectedLayer.fontSize}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                fontSize: parseInt(e.target.value) || 52,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>اللون</span>
                          <input
                            type="color"
                            value={designer.selectedLayer.color}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, { color: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          <span>الخط</span>
                          <select
                            value={designer.selectedLayer.fontFamily}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, { fontFamily: e.target.value })
                            }
                          >
                            {FONT_OPTIONS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>السُمك</span>
                          <select
                            value={designer.selectedLayer.fontWeight}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, { fontWeight: e.target.value })
                            }
                          >
                            <option value="400">عادي</option>
                            <option value="600">متوسط</option>
                            <option value="700">غامق</option>
                            <option value="800">أغمق</option>
                          </select>
                        </label>
                        <label>
                          <span>محاذاة</span>
                          <select
                            value={designer.selectedLayer.textAlign}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                textAlign: e.target.value as CanvasTextAlign,
                              })
                            }
                          >
                            <option value="center">وسط</option>
                            <option value="right">يمين</option>
                            <option value="left">يسار</option>
                          </select>
                        </label>
                        <label className="netcard-prop-check">
                          <input
                            type="checkbox"
                            checked={designer.selectedLayer.shadowOn}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, { shadowOn: e.target.checked })
                            }
                          />
                          <span>ظل للنص (وضوح أفضل)</span>
                        </label>
                        <label className="netcard-prop-check">
                          <input
                            type="checkbox"
                            checked={Boolean(designer.selectedLayer.boxEnabled)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                boxEnabled: e.target.checked,
                              })
                            }
                          />
                          <span>صندوق خلف النص (Odoo)</span>
                        </label>
                        <label>
                          <span>عرض الصندوق</span>
                          <input
                            type="number"
                            min={0}
                            value={Math.round(designer.selectedLayer.boxWidth || 0)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                boxWidth: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>ارتفاع الصندوق</span>
                          <input
                            type="number"
                            min={0}
                            value={Math.round(designer.selectedLayer.boxHeight || 0)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                boxHeight: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>لون الصندوق</span>
                          <input
                            type="color"
                            value={designer.selectedLayer.boxColor || '#ffffff'}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                boxColor: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>توسيع X %</span>
                          <input
                            type="number"
                            min={20}
                            max={500}
                            value={Math.round((designer.selectedLayer.scaleX ?? 1) * 100)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                scaleX: (parseInt(e.target.value) || 100) / 100,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>توسيع Y %</span>
                          <input
                            type="number"
                            min={20}
                            max={500}
                            value={Math.round((designer.selectedLayer.scaleY ?? 1) * 100)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                scaleY: (parseInt(e.target.value) || 100) / 100,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>موقع X</span>
                          <input
                            type="number"
                            value={Math.round(designer.selectedLayer.x)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                x: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>موقع Y</span>
                          <input
                            type="number"
                            value={Math.round(designer.selectedLayer.y)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                y: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>شفافية %</span>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={Math.round(designer.selectedLayer.opacity * 100)}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                opacity: parseInt(e.target.value) / 100,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {designer.selectedLayer?.type === 'image' && (
                    <div className="netcard-section">
                      <p className="netcard-section-title">حجم الصورة</p>
                      <div className="netcard-props">
                        <label>
                          <span>العرض</span>
                          <input
                            type="number"
                            value={designer.selectedLayer.width}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                width: parseInt(e.target.value) || 100,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>الارتفاع</span>
                          <input
                            type="number"
                            value={designer.selectedLayer.height}
                            onChange={(e) =>
                              designer.updateLayer(designer.selectedLayer!.id, {
                                height: parseInt(e.target.value) || 100,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {!designer.selectedLayer && designer.layers.length > 0 && (
                    <p className="netcard-hint">اضغط ✥ لتحديد ليبل · اسحبه · عدّل من الجانب</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={() => setTab('templates')}>
                ← تغيير القالب
              </Button>
            </div>
          </div>
        )}

        {tab === 'settings' && !guestMode && catalog.state && (
          <NetcardSettingsTab
            catalogState={catalog.state}
            types={catalog.types}
            wallets={catalog.wallets}
            allTemplates={catalog.allTemplates}
            onCatalogChange={() => catalog.reload()}
            addKind={catalog.addKind}
            removeKind={catalog.removeKind}
            updateTemplateMeta={catalog.updateTemplateMeta}
            refreshCustomTemplates={refreshCustomTemplates}
          />
        )}
      </div>
    </div>
  );
}
