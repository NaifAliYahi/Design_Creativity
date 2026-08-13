import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CustomerPicker } from '../components/CustomerPicker';
import { QuickFollowUpModal } from '../components/QuickModals';
import { Button, Card, CardBody, CardHeader, PageHeader, Badge } from '../components/ui';
import { todayDate } from '../constants';
import type { Customer } from '../types';

const MORNING_ITEMS = [
  'راجع متابعات اليوم (القائمة أدناه)',
  'ابدأ بالمتأخر (اللون الأحمر)',
  'حدّث كل شبكة بعد التواصل',
];

export function MyWorkPage() {
  const { data, currentEmployee, updateCustomer } = useApp();
  const { session } = useAuth();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [quickCustomer, setQuickCustomer] = useState<Customer | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const today = todayDate();

  const myActive = useMemo(
    () =>
      data.customers.filter(
        (c) => c.currentEmployee === currentEmployee && !['مغلق', 'مفقود'].includes(c.orderStatus)
      ),
    [data.customers, currentEmployee]
  );

  const followUpsToday = myActive.filter((c) => c.followUpDate?.slice(0, 10) === today);
  const overdue = myActive.filter((c) => c.followUpDate && new Date(c.followUpDate) < new Date());

  return (
    <div>
      <PageHeader
        title={`مرحبًا ${session?.displayName ?? currentEmployee}`}
        subtitle="① اختر الشبكة → ② متابعة → ③ حفظ"
      />

      {/* اختيار الشبكة — Odoo style */}
      <Card className="mb-6 border-2 border-brand-300">
        <CardBody>
          <p className="mb-3 text-base font-bold text-slate-800">اختر الشبكة</p>
          <CustomerPicker
            customers={data.customers}
            selected={selected}
            onSelect={(c) => setSelected(c)}
            onClear={() => setSelected(null)}
            autoFocus
          />

          {selected && (
            <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-brand-50 p-4">
              <div className="flex-1 min-w-[200px]">
                <p className="font-mono text-2xl font-bold text-brand-900">{selected.code}</p>
                <p className="text-lg">{selected.networkName}</p>
                <p className="text-sm text-slate-600">{selected.phone}</p>
                <Badge className="mt-2">{selected.orderStatus}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  className="py-3 px-6 text-base"
                  onClick={() => setQuickCustomer(selected)}
                >
                  متابعة الآن
                </Button>
                <Link to={`/customers/${selected.id}`}>
                  <Button variant="secondary" className="py-3 px-6">
                    تفاصيل كاملة
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/customers/new"
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 p-5 hover:bg-emerald-100"
        >
          <span className="text-3xl">+</span>
          <div>
            <p className="font-bold text-emerald-900">شبكة جديدة</p>
            <p className="text-xs text-emerald-700">إذا لم تجدها في البحث</p>
          </div>
        </Link>
        <Link
          to="/replies"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm hover:bg-emerald-100"
        >
          <span className="text-3xl">💬</span>
          <div>
            <p className="font-bold text-emerald-900">ردود واتساب</p>
            <p className="text-xs text-emerald-700">ابحث → انسخ → أرسل</p>
          </div>
        </Link>
        <Link
          to="/studio"
          className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5 shadow-sm hover:bg-teal-100"
        >
          <span className="text-3xl">🎨</span>
          <div>
            <p className="font-bold text-teal-900">قالب التصميم</p>
            <p className="text-xs text-teal-700">بطاقة PNG للعميل</p>
          </div>
        </Link>
        <Link
          to="/import"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <span className="text-3xl">📥</span>
          <div>
            <p className="font-bold">رفع Excel</p>
            <p className="text-xs text-slate-500">{data.customers.length} شبكة مسجلة</p>
          </div>
        </Link>
        <Link
          to="/reports"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
        >
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-bold">تقرير اليوم</p>
            <p className="text-xs text-slate-500">قبل 5 مساءً</p>
          </div>
        </Link>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="بداية اليوم ✓" />
          <CardBody className="space-y-2">
            {MORNING_ITEMS.map((item, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                  className="h-5 w-5"
                />
                <span className={checked[i] ? 'text-slate-400 line-through' : 'text-sm'}>{item}</span>
              </label>
            ))}
          </CardBody>
        </Card>

        <Card className={overdue.length ? 'border-rose-300 lg:col-span-1' : 'lg:col-span-1'}>
          <CardHeader title={`🔴 متأخر (${overdue.length})`} />
          <CardBody className="space-y-1 p-0 max-h-64 overflow-auto">
            {overdue.length === 0 ? (
              <p className="p-4 text-center text-emerald-600 text-sm">ممتاز — لا تأخير</p>
            ) : (
              overdue.map((c) => (
                <CustomerRow key={c.id} c={c} onQuick={() => setQuickCustomer(c)} />
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`📅 اليوم (${followUpsToday.length})`} />
          <CardBody className="space-y-1 p-0 max-h-64 overflow-auto">
            {followUpsToday.length === 0 ? (
              <p className="p-4 text-center text-slate-500 text-sm">لا متابعات مجدولة</p>
            ) : (
              followUpsToday.map((c) => (
                <CustomerRow key={c.id} c={c} onQuick={() => setQuickCustomer(c)} />
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <QuickFollowUpModal
        customer={quickCustomer}
        open={!!quickCustomer}
        onClose={() => setQuickCustomer(null)}
        onSave={(patch) => {
          if (quickCustomer) {
            updateCustomer(quickCustomer.id, patch);
            if (selected?.id === quickCustomer.id) {
              setSelected({ ...quickCustomer, ...patch, lastUpdated: new Date().toISOString() });
            }
          }
        }}
      />
    </div>
  );
}

function CustomerRow({ c, onQuick }: { c: Customer; onQuick: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
      <button type="button" onClick={onQuick} className="text-right hover:text-brand-700">
        <span className="font-mono font-bold">{c.code}</span>
        <span className="mx-1 text-slate-300">|</span>
        <span className="text-sm">{c.networkName}</span>
      </button>
      <Button size="sm" onClick={onQuick}>
        متابعة
      </Button>
    </div>
  );
}
