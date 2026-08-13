import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CustomerPicker } from '../components/CustomerPicker';
import { Button, Card, CardBody, PageHeader, Badge } from '../components/ui';
import { ORDER_STATUS_COLORS } from '../constants';
import {
  RESPONSE_CATEGORIES,
  STATUS_CATEGORY_HINTS,
  searchResponses,
  getResponseText,
  openWhatsApp,
  type ResponseVariant,
} from '../lib/responses';
import type { Customer, ResponseTemplate } from '../types';

const VARIANTS: { key: ResponseVariant; label: string; icon: string }[] = [
  { key: 'simple', label: 'بسيط', icon: '⚡' },
  { key: 'r2', label: 'بديل', icon: '↩' },
  { key: 'r3', label: 'ثالث', icon: '↩' },
  { key: 'detailed', label: 'تفصيلي', icon: '📋' },
];

const SMART_CHIPS: Record<string, string[]> = {
  جديد: ['تفعيل', 'انضمام', 'SMS'],
  'قيد التنفيذ': ['لوحة التحكم', 'كروت', 'متابعة'],
  'بانتظار العميل': ['مرفقات', 'شراء كرت', 'متابعة'],
  'بانتظار مرفقات': ['مرفقات', 'رفع', 'تذكير'],
  'بانتظار مخزون': ['كروت', 'استيراد', 'مخزون'],
  'بانتظار تصميم': ['تصميم', 'تعديل', 'متابعة'],
  'بانتظار دعم فني': ['كلمة المرور', 'SMS', 'دعم'],
  مكتمل: ['سحب', 'محفظة', 'مبيعات'],
};

export function RepliesPage() {
  const navigate = useNavigate();
  const { data, sendWhatsAppResponse } = useApp();
  const { session } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('الكل');
  const [filterOpen, setFilterOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [shared, setShared] = useState('');

  const filterActive = category !== 'الكل';

  const results = useMemo(
    () =>
      searchResponses(data.responseTemplates, {
        query,
        category: filterActive ? category : undefined,
        customer: selected,
        limit: 3,
      }),
    [data.responseTemplates, query, category, filterActive, selected]
  );

  const smartChips = useMemo(() => {
    if (!selected) return ['كلمة المرور', 'كروت', 'مرفقات', 'محفظة'];
    return SMART_CHIPS[selected.orderStatus] ?? STATUS_CATEGORY_HINTS[selected.orderStatus] ?? [];
  }, [selected]);

  useEffect(() => {
    if (selected) searchRef.current?.focus();
  }, [selected]);

  const notify = (id: string, setter: (v: string) => void) => {
    setter(id);
    setTimeout(() => setter(''), 2200);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    notify(id, setCopied);
  };

  const handleShare = async (text: string, title: string, id: string) => {
    if (selected?.phone) {
      openWhatsApp(selected.phone, text);
      notify(id, setShared);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        notify(id, setShared);
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(text);
    notify(id, setCopied);
  };

  const handleSend = (template: ResponseTemplate, variant: ResponseVariant) => {
    if (!selected) return;
    sendWhatsAppResponse(selected, template, variant);
  };

  const clearFilters = () => {
    setCategory('الكل');
    setFilterOpen(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`ردود واتساب — ${session?.displayName ?? ''}`}
        subtitle="ابحث → انسخ أو شارك → أرسل"
        action={
          <Link to="/replies/new">
            <Button variant="secondary" className="py-2.5 px-4">
              + رد جديد
            </Button>
          </Link>
        }
      />

      {/* بطاقة رئيسية — نفس أسلوب عملي اليوم */}
      <Card className="mb-6 border-2 border-brand-300 shadow-md">
        <CardBody className="space-y-5">
          {/* ① الشبكة */}
          <div>
            <p className="mb-2 text-sm font-bold text-brand-800">① اختر الشبكة</p>
            <CustomerPicker
              customers={data.customers}
              selected={selected}
              onSelect={setSelected}
              onClear={() => setSelected(null)}
              autoFocus
            />
            {selected && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-l from-brand-50 to-white p-4 ring-1 ring-brand-100">
                <div>
                  <p className="font-mono text-2xl font-bold text-brand-900">{selected.code}</p>
                  <p className="font-medium text-slate-800">{selected.networkName}</p>
                  <p className="font-mono text-sm text-slate-500">{selected.phone}</p>
                </div>
                <Badge className={`${ORDER_STATUS_COLORS[selected.orderStatus]} px-3 py-1 text-sm`}>
                  {selected.orderStatus}
                </Badge>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100" />

          {/* ② البحث */}
          <div>
            <p className="mb-2 text-sm font-bold text-brand-800">② ابحث عن الرد</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg opacity-40">
                  ✨
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="اكتب كلمة… مثل: كلمة المرور، مرفقات، كروت"
                  className="w-full rounded-xl border-2 border-brand-200 py-3.5 pl-4 pr-11 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className={`relative flex shrink-0 items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  filterOpen || filterActive
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-slate-50'
                }`}
              >
                <span>⎚</span>
                فلترة
                {filterActive && (
                  <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">
                    1
                  </span>
                )}
              </button>
            </div>

            {/* لوحة الفلترة — تظهر عند الطلب فقط */}
            {filterOpen && (
              <div className="mt-3 animate-in fade-in rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">فلترة حسب التصنيف</p>
                  {filterActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      مسح الفلتر (الكل)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterChip active={category === 'الكل'} onClick={() => setCategory('الكل')} label="الكل" />
                  {RESPONSE_CATEGORIES.map((c) => (
                    <FilterChip
                      key={c}
                      active={category === c}
                      onClick={() => setCategory(c)}
                      label={c}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* اقتراحات ذكية */}
            <div className="mt-3">
              <p className="mb-2 text-xs text-slate-500">
                {selected ? '🎯 اقتراحات لحالة الشبكة — اضغط للبحث:' : '💡 جرّب:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {smartChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setQuery(chip)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      query === chip
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* النتائج */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {results.length > 0 ? (
            <>
              <span className="text-brand-600">✨ {results.length}</span> رد{' '}
              {selected && !query ? 'مقترح لحالتك' : 'مناسب'}
            </>
          ) : (
            'لا نتائج'
          )}
        </p>
        <p className="text-xs text-slate-400">{data.responseTemplates.length} رد في القاعدة</p>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <Card className="border-2 border-dashed border-amber-200 bg-gradient-to-b from-amber-50 to-white">
            <CardBody className="py-10 text-center">
              <p className="text-4xl opacity-30">🔍</p>
              <p className="mt-3 text-lg font-bold text-slate-800">لم نجد رداً مطابقاً</p>
              <p className="mt-1 text-sm text-slate-500">جرّب كلمة أخرى أو أضف رداً جديداً</p>
              <Button
                className="mt-5 px-6 py-3"
                onClick={() => navigate(`/replies/new?q=${encodeURIComponent(query)}`)}
              >
                + إضافة رد
              </Button>
            </CardBody>
          </Card>
        ) : (
          results.map((template, index) => (
            <SmartResponseCard
              key={template.id}
              template={template}
              rank={index}
              hasCustomer={!!selected}
              copied={copied}
              shared={shared}
              onCopy={handleCopy}
              onShare={handleShare}
              onSend={handleSend}
              onEdit={() => navigate(`/replies/${template.id}`)}
            />
          ))
        )}
      </div>

      {results.length > 0 && (
        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate(`/replies/new?q=${encodeURIComponent(query)}`)}
            className="text-sm text-brand-600 hover:underline"
          >
            لم تجد ما تريد؟ أضف رداً جديداً
          </button>
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'
      }`}
    >
      {label}
    </button>
  );
}

function SmartResponseCard({
  template,
  rank,
  hasCustomer,
  copied,
  shared,
  onCopy,
  onShare,
  onSend,
  onEdit,
}: {
  template: ResponseTemplate;
  rank: number;
  hasCustomer: boolean;
  copied: string;
  shared: string;
  onCopy: (text: string, id: string) => void;
  onShare: (text: string, title: string, id: string) => void;
  onSend: (t: ResponseTemplate, v: ResponseVariant) => void;
  onEdit: () => void;
}) {
  const available = VARIANTS.filter(({ key }) => {
    if (key === 'simple') return true;
    if (key === 'r2') return !!template.response2;
    if (key === 'r3') return !!template.response3;
    if (key === 'detailed') return !!template.responseDetailed;
    return false;
  });

  const [variant, setVariant] = useState<ResponseVariant>('simple');
  const text = getResponseText(template, variant);
  const actionId = `${template.id}-${variant}`;

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${
        rank === 0 ? 'ring-2 ring-brand-300 ring-offset-1' : ''
      }`}
    >
      <CardBody className="p-0">
        {/* رأس البطاقة */}
        <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {rank === 0 && (
                  <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    ⭐ الأنسب
                  </span>
                )}
                <Badge className="bg-slate-100 text-slate-600">{template.category}</Badge>
              </div>
              <p className="text-base font-bold leading-snug text-slate-900">{template.title}</p>
            </div>
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="تعديل"
            >
              ✎
            </button>
          </div>
        </div>

        {/* تبويبات الصيغ */}
        {available.length > 1 && (
          <div className="flex gap-1 border-b border-slate-100 bg-white px-4 pt-3">
            {available.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setVariant(key)}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  variant === key
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* نص الرد — ظاهر مباشرة */}
        <div className="px-5 py-4">
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{text}</p>
          </div>

          {/* أزرار الإجراء — دائماً ظاهرة */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <ActionBtn
              icon={copied === actionId ? '✓' : '📋'}
              label={copied === actionId ? 'نُسخ!' : 'نسخ'}
              onClick={() => onCopy(text, actionId)}
              variant="secondary"
            />
            <ActionBtn
              icon={shared === actionId ? '✓' : '📤'}
              label={shared === actionId ? 'تم!' : 'مشاركة'}
              onClick={() => onShare(text, template.title, actionId)}
              variant="secondary"
            />
            <ActionBtn
              icon="💬"
              label="واتساب"
              onClick={() => onSend(template, variant)}
              disabled={!hasCustomer}
              variant="primary"
              title={hasCustomer ? 'فتح واتساب وتحديث المتابعة' : 'اختر شبكة أولاً'}
            />
          </div>
          {!hasCustomer && (
            <p className="mt-2 text-center text-xs text-amber-600">↑ اختر الشبكة أعلاه لتفعيل واتساب</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  disabled,
  variant,
  title,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant: 'primary' | 'secondary';
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === 'primary'
          ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
          : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-brand-300'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
